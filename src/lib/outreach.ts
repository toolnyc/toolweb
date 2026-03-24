import { searchPeopleAtCompany, discoverByIcp, enrichPerson, type ApolloPerson, type ApolloSearchResult } from './apollo';
import { getSupabaseAdmin, getEnv } from './env';

export interface BatchOptions {
  targetTitles: string[];
  minScore?: number;
  minEmployees?: number;
  maxEmployees?: number;
  perPage?: number;
}

export interface DiscoverOptions {
  targetTitles: string[];
  employeeRanges?: string[];
  locations?: string[];
  industries?: string[];
  minScore?: number;
}

interface ProspectRow {
  batch_id: string;
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
}

/**
 * Score a prospect based on data completeness and company fit.
 * No hardcoded title weighting — titles are whatever you searched for,
 * so if Apollo returned them they're already relevant.
 */
function scoreProspect(person: ApolloPerson, minEmployees = 1, maxEmployees = 10000): number {
  let score = 0;

  // Has a title at all (matched search criteria)
  if (person.title) score += 25;

  // Has email
  if (person.email) score += 30;

  // Has LinkedIn
  if (person.linkedin_url) score += 15;

  // Company size in target range
  const employees = person.organization?.estimated_num_employees ?? 0;
  if (employees >= minEmployees && employees <= maxEmployees) score += 20;

  // Has company info
  if (person.organization?.short_description) score += 10;

  return Math.min(score, 100);
}

/**
 * Run ICP-based discovery — searches Apollo by the filters you provide.
 * No hardcoded defaults — titles, size, etc. all come from parameters.
 */
export async function runIcpDiscovery(pages: number, batchId: string, options: DiscoverOptions): Promise<void> {
  const supabase = getSupabaseAdmin();
  const env = getEnv();
  const apolloKey = env.APOLLO_API_KEY;

  if (!apolloKey) {
    await supabase.from('outreach_batches').update({ status: 'failed', notes: 'APOLLO_API_KEY not configured' }).eq('id', batchId);
    return;
  }

  try {
    const titles = options.targetTitles;
    const minScore = options.minScore ?? 15;
    const employeeRanges = options.employeeRanges ?? ['1,5000'];
    const locations = options.locations ?? [];
    const industries = options.industries ?? [];

    // Load existing apollo_person_ids to deduplicate
    const { data: existing } = await supabase
      .from('outreach_prospects')
      .select('apollo_person_id')
      .not('apollo_person_id', 'is', null);

    const seenIds = new Set((existing ?? []).map((r: { apollo_person_id: string }) => r.apollo_person_id));

    let totalFromApollo = 0;
    let totalDupe = 0;
    let totalEnrichFailed = 0;
    let totalLowScore = 0;
    let totalProspects = 0;
    let consecutiveEnrichFailures = 0;
    const ENRICH_FAILURE_LIMIT = 5;

    for (let page = 1; page <= pages; page++) {
      let searchResults: ApolloSearchResult[] = [];
      try {
        const result = await discoverByIcp(apolloKey, {
          titles,
          employeeRanges,
          locations,
          industries,
          page,
          perPage: 25,
        });
        searchResults = result.people;
        totalFromApollo += searchResults.length;
        console.log(`Apollo ICP page ${page}: ${searchResults.length} results`);
      } catch (err) {
        console.error(`Apollo ICP discovery page ${page} failed:`, err);
        throw err;
      }

      for (const candidate of searchResults) {
        if (consecutiveEnrichFailures >= ENRICH_FAILURE_LIMIT) {
          console.error(`Circuit breaker: ${ENRICH_FAILURE_LIMIT} consecutive enrichment failures — aborting`);
          throw new Error(`Apollo enrichment failed ${ENRICH_FAILURE_LIMIT} times in a row (credits exhausted or rate limited?)`);
        }

        if (seenIds.has(candidate.id)) { totalDupe++; continue; }
        seenIds.add(candidate.id);

        const enriched = await enrichPerson(apolloKey, candidate.id);
        if (!enriched) {
          totalEnrichFailed++;
          consecutiveEnrichFailures++;
          continue;
        }
        consecutiveEnrichFailures = 0;

        const score = scoreProspect(enriched);
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
          signal: `Discovery — ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '...' : ''}`,
          company_size: org?.estimated_num_employees != null ? String(org.estimated_num_employees) : null,
          company_industry: org?.industry ?? null,
          company_description: org?.short_description ?? null,
          confidence_score: score,
        } satisfies ProspectRow);
        totalProspects++;
      }
    }

    const notes = [
      `Discovery — ${pages} page(s)`,
      `${totalFromApollo} from Apollo`,
      totalDupe > 0 ? `${totalDupe} dupes` : null,
      totalEnrichFailed > 0 ? `${totalEnrichFailed} enrich-failed` : null,
      totalLowScore > 0 ? `${totalLowScore} low-score` : null,
      `${totalProspects} added`,
    ].filter(Boolean).join(' · ');

    await supabase
      .from('outreach_batches')
      .update({
        status: 'complete',
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
 * Titles and filters are all passed in — no defaults.
 */
export async function runOutreachBatch(companies: string[], batchId: string, options: BatchOptions): Promise<void> {
  const supabase = getSupabaseAdmin();
  const env = getEnv();
  const apolloKey = env.APOLLO_API_KEY;

  if (!apolloKey) {
    await supabase.from('outreach_batches').update({ status: 'failed', notes: 'APOLLO_API_KEY not configured' }).eq('id', batchId);
    return;
  }

  try {
    const titles = options.targetTitles;
    const minScore = options.minScore ?? 15;
    const minEmployees = options.minEmployees ?? 1;
    const maxEmployees = options.maxEmployees ?? 10000;
    const perPage = options.perPage ?? 10;

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
        const enriched = await enrichPerson(apolloKey, candidate.id);
        if (!enriched) continue;

        const score = scoreProspect(enriched, minEmployees, maxEmployees);
        if (score < minScore) continue;

        const org = enriched.organization;
        await supabase.from('outreach_prospects').insert({
          batch_id: batchId,
          apollo_person_id: enriched.id,
          name: enriched.name,
          title: enriched.title,
          company: org?.name ?? company,
          email: enriched.email,
          linkedin_url: enriched.linkedin_url,
          signal: `Company search — ${company}`,
          company_size: org?.estimated_num_employees != null ? String(org.estimated_num_employees) : null,
          company_industry: org?.industry ?? null,
          company_description: org?.short_description ?? null,
          confidence_score: score,
        } satisfies ProspectRow);
        totalProspects++;
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
