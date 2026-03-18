import { searchPeopleAtCompany, discoverByIcp, enrichPerson, type ApolloPerson, type ApolloSearchResult } from './apollo';
import { getSupabaseAdmin, getEnv } from './env';

// Titles likely to be decision-makers for a solo creative/dev shop
const TARGET_TITLES = [
  'Creative Director',
  'Head of Design',
  'Head of Marketing',
  'VP Marketing',
  'VP Brand',
  'Brand Director',
  'Director of Marketing',
  'Director of Brand',
  'Head of Brand',
  'Marketing Director',
  'CMO',
  'Founder',
  'CEO',
  'Co-founder',
];

export interface BatchOptions {
  targetTitles?: string[];
  minScore?: number;
  minEmployees?: number;
  maxEmployees?: number;
  perPage?: number;
}

interface ProspectDraft {
  apollo_person_id: string | null;
  name: string;
  title: string | null;
  company: string;
  email: string | null;
  linkedin_url: string | null;
  signal: string | null;
  company_size: string | null;
  company_industry: string | null;
  company_description: string | null;
  confidence_score: number;
  draft_subject: string | null;
  draft_body: string | null;
}

// Quick title-only score used to pre-screen search results before enrichment.
// Apollo's api_search only returns title — email/LinkedIn/org come after enrichment.
function quickTitleScore(title: string | null): number {
  const t = (title ?? '').toLowerCase();
  if (/creative director|head of design|head of brand|brand director/.test(t)) return 35;
  if (/cmo|vp (marketing|brand)|director of (marketing|brand)/.test(t)) return 25;
  if (/founder|ceo|co-founder/.test(t)) return 15;
  if (/marketing/.test(t)) return 10;
  return 0;
}

function scoreProspect(person: ApolloPerson, minEmployees = 10, maxEmployees = 300): number {
  let score = 0;
  const title = (person.title ?? '').toLowerCase();

  // Title relevance
  if (/creative director|head of design|head of brand|brand director/.test(title)) score += 35;
  else if (/cmo|vp (marketing|brand)|director of (marketing|brand)/.test(title)) score += 25;
  else if (/founder|ceo|co-founder/.test(title)) score += 15;
  else if (/marketing/.test(title)) score += 10;

  // Has email
  if (person.email) score += 25;

  // Has LinkedIn
  if (person.linkedin_url) score += 10;

  // Company size sweet spot
  const employees = person.organization?.estimated_num_employees ?? 0;
  const sweetSpotTop = minEmployees + (maxEmployees - minEmployees) / 5;
  if (employees >= minEmployees && employees <= sweetSpotTop) score += 20;
  else if (employees > sweetSpotTop && employees <= maxEmployees) score += 10;

  return Math.min(score, 100);
}

// ICP profile for Pete's solo creative/dev shop
const ICP_FILTERS = {
  titles: TARGET_TITLES,
  // Sweet spot: 10–300 employees
  employeeRanges: ['10,50', '51,200', '201,300'],
  // Location omitted — Apollo's person_locations requires exact internal
  // geography strings and silently returns 0 when they don't match.
  // Title + size filters are sufficient for targeting without the risk.
  locations: [] as string[],
};

/**
 * Enrich a search result candidate and insert it as a prospect if it scores well.
 * Shared by both runIcpDiscovery and runOutreachBatch.
 * Returns true if the candidate was inserted.
 */
async function processCandidate(
  apolloKey: string,
  candidate: ApolloSearchResult,
  batchId: string,
  signal: string,
  fallbackCompany: string,
  supabase: ReturnType<typeof getSupabaseAdmin>,
  minScore = 20,
  minEmployees = 10,
  maxEmployees = 300,
): Promise<boolean> {
  const enriched = await enrichPerson(apolloKey, candidate.id);
  if (!enriched) return false;

  const score = scoreProspect(enriched, minEmployees, maxEmployees);
  if (score < minScore) return false;

  const org = enriched.organization;
  const prospect: ProspectDraft = {
    apollo_person_id: enriched.id,
    name: enriched.name,
    title: enriched.title,
    company: org?.name ?? fallbackCompany,
    email: enriched.email,
    linkedin_url: enriched.linkedin_url,
    signal,
    company_size: org?.estimated_num_employees != null
      ? String(org.estimated_num_employees)
      : null,
    company_industry: org?.industry ?? null,
    company_description: org?.short_description ?? null,
    confidence_score: score,
    draft_subject: null,
    draft_body: null,
  };

  await supabase.from('outreach_prospects').insert({ batch_id: batchId, ...prospect });
  return true;
}

/**
 * Run ICP-based discovery — no company names needed.
 * Searches Apollo by title + company size, enriches promising candidates,
 * deduplicates against existing prospects, and updates the given batch.
 */
export interface IcpOptions {
  targetTitles?: string[];
  minScore?: number;
}

export async function runIcpDiscovery(pages: number, batchId: string, options?: IcpOptions): Promise<void> {
  const supabase = getSupabaseAdmin();
  const env = getEnv();
  const apolloKey = env.APOLLO_API_KEY;

  if (!apolloKey) {
    await supabase.from('outreach_batches').update({ status: 'failed', notes: 'APOLLO_API_KEY not configured' }).eq('id', batchId);
    return;
  }

  try {
    const titles = options?.targetTitles ?? ICP_FILTERS.titles;
    const minScore = options?.minScore ?? 20;

    // Load existing apollo_person_ids to deduplicate
    const { data: existing } = await supabase
      .from('outreach_prospects')
      .select('apollo_person_id')
      .not('apollo_person_id', 'is', null);

    const seenIds = new Set((existing ?? []).map((r: { apollo_person_id: string }) => r.apollo_person_id));

    let totalFromApollo = 0;
    let totalDupe = 0;
    let totalLowTitle = 0;
    let totalEnrichFailed = 0;
    let totalLowScore = 0;
    let totalProspects = 0;
    let pageError: string | null = null;
    // Circuit breaker: abort enrichment loop if Apollo keeps failing
    let consecutiveEnrichFailures = 0;
    const ENRICH_FAILURE_LIMIT = 5;

    for (let page = 1; page <= pages; page++) {
      let searchResults: ApolloSearchResult[] = [];
      try {
        const result = await discoverByIcp(apolloKey, { ...ICP_FILTERS, titles, page, perPage: 25 });
        searchResults = result.people;
        totalFromApollo += searchResults.length;
        console.log(`Apollo ICP page ${page}: ${searchResults.length} results`);
      } catch (err) {
        console.error(`Apollo ICP discovery page ${page} failed:`, err);
        pageError = err instanceof Error ? err.message : String(err);
        break;
      }

      for (const candidate of searchResults) {
        // Stop enriching if Apollo is consistently rejecting calls
        if (consecutiveEnrichFailures >= ENRICH_FAILURE_LIMIT) {
          console.error(`Circuit breaker: ${ENRICH_FAILURE_LIMIT} consecutive enrichment failures — aborting`);
          throw new Error(`Apollo enrichment failed ${ENRICH_FAILURE_LIMIT} times in a row (credits exhausted or rate limited?)`);
        }

        // Skip already-seen prospects
        if (seenIds.has(candidate.id)) { totalDupe++; continue; }
        seenIds.add(candidate.id);

        // Pre-filter by title before spending an enrichment call
        if (quickTitleScore(candidate.title) === 0) { totalLowTitle++; continue; }

        const enriched = await enrichPerson(apolloKey, candidate.id);
        if (!enriched) {
          totalEnrichFailed++;
          consecutiveEnrichFailures++;
          continue;
        }
        consecutiveEnrichFailures = 0;

        const score = scoreProspect(enriched, 10, 300);
        if (score < minScore) { totalLowScore++; continue; }

        const org = enriched.organization;
        await supabase.from('outreach_prospects').insert({
          batch_id: batchId,
          apollo_person_id: enriched.id,
          name: enriched.name,
          title: enriched.title,
          company: org?.name ?? candidate.organization?.name ?? 'Unknown',
          email: enriched.email,
          linkedin_url: enriched.linkedin_url,
          signal: 'ICP discovery — profile match',
          company_size: org?.estimated_num_employees != null ? String(org.estimated_num_employees) : null,
          company_industry: org?.industry ?? null,
          company_description: org?.short_description ?? null,
          confidence_score: score,
          draft_subject: null,
          draft_body: null,
        });
        totalProspects++;
      }
    }

    const notes = [
      `ICP discovery — ${pages} page(s)`,
      `${totalFromApollo} from Apollo`,
      totalDupe > 0 ? `${totalDupe} dupes` : null,
      totalLowTitle > 0 ? `${totalLowTitle} low-title` : null,
      totalEnrichFailed > 0 ? `${totalEnrichFailed} enrich-failed` : null,
      totalLowScore > 0 ? `${totalLowScore} low-score` : null,
      `${totalProspects} added`,
      pageError ? `Apollo error: ${pageError}` : null,
    ].filter(Boolean).join(' · ');

    // Mark failed only if we got an Apollo error AND found nothing — otherwise surface
    // whatever prospects we collected before the error (partial success is useful).
    const status = pageError && totalProspects === 0 ? 'failed' : 'complete';

    await supabase
      .from('outreach_batches')
      .update({
        status,
        prospect_count: totalProspects,
        completed_at: new Date().toISOString(),
        notes,
      })
      .eq('id', batchId);
  } catch (err) {
    console.error('runIcpDiscovery failed:', err);
    await supabase
      .from('outreach_batches')
      .update({ status: 'failed', notes: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` })
      .eq('id', batchId);
  }
}

/**
 * Run the outreach pipeline for a list of company names.
 * Writes results to outreach_prospects and updates the given batch to complete.
 */
export async function runOutreachBatch(companies: string[], batchId: string, options?: BatchOptions): Promise<void> {
  const supabase = getSupabaseAdmin();
  const env = getEnv();
  const apolloKey = env.APOLLO_API_KEY;

  if (!apolloKey) {
    await supabase.from('outreach_batches').update({ status: 'failed', notes: 'APOLLO_API_KEY not configured' }).eq('id', batchId);
    return;
  }

  try {
    const titles = options?.targetTitles ?? TARGET_TITLES;
    const minScore = options?.minScore ?? 20;
    const minEmployees = options?.minEmployees ?? 10;
    const maxEmployees = options?.maxEmployees ?? 300;
    const perPage = options?.perPage ?? 10;

    let totalProspects = 0;

    for (const company of companies) {
      let searchResults: ApolloSearchResult[] = [];
      try {
        searchResults = await searchPeopleAtCompany(apolloKey, company, titles, perPage);
      } catch (err) {
        console.error(`Apollo search failed for ${company}:`, err);
        continue;
      }

      for (const candidate of searchResults) {
        // Pre-filter by title before enriching
        if (quickTitleScore(candidate.title) === 0) continue;

        const added = await processCandidate(
          apolloKey, candidate, batchId,
          `Company batch — ${company}`,
          company,
          supabase,
          minScore,
          minEmployees,
          maxEmployees,
        );
        if (added) totalProspects++;
      }
    }

    await supabase
      .from('outreach_batches')
      .update({
        status: 'complete',
        prospect_count: totalProspects,
        completed_at: new Date().toISOString(),
      })
      .eq('id', batchId);
  } catch (err) {
    console.error('runOutreachBatch failed:', err);
    await supabase
      .from('outreach_batches')
      .update({ status: 'failed', notes: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` })
      .eq('id', batchId);
  }
}
