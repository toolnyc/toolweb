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

export interface BatchProgress {
  phase: 'searching' | 'enriching' | 'done' | 'error';
  currentPage?: number;
  totalPages?: number;
  currentCompany?: string;
  totalCompanies?: number;
  companiesSearched?: number;
  candidatesFound: number;
  candidatesChecked: number;
  enriched: number;
  enrichFailed: number;
  dupes: number;
  lowScore: number;
  added: number;
  lastAdded?: string;
  error?: string;
}

function scoreProspect(person: ApolloPerson, minEmployees = 1, maxEmployees = 10000): number {
  let score = 0;
  if (person.title) score += 25;
  if (person.email) score += 30;
  if (person.linkedin_url) score += 15;
  const employees = person.organization?.estimated_num_employees ?? 0;
  if (employees >= minEmployees && employees <= maxEmployees) score += 20;
  if (person.organization?.short_description) score += 10;
  return Math.min(score, 100);
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Throttle progress writes to at most once per second
function createProgressWriter(supabase: SupabaseAdmin, batchId: string) {
  let pending: BatchProgress | null = null;
  let writing = false;
  let lastWrite = 0;

  async function flush(progress: BatchProgress, force = false): Promise<void> {
    pending = { ...progress };
    const now = Date.now();
    if (!force && (writing || now - lastWrite < 1000)) return;
    writing = true;
    lastWrite = now;
    const toWrite = pending;
    pending = null;
    await supabase.from('outreach_batches')
      .update({ progress: toWrite as unknown as Record<string, unknown> })
      .eq('id', batchId);
    writing = false;
  }

  return { update: (p: BatchProgress) => flush(p), flush: (p: BatchProgress) => flush(p, true) };
}

async function isCancelled(supabase: SupabaseAdmin, batchId: string): Promise<boolean> {
  const { data } = await supabase.from('outreach_batches')
    .select('status')
    .eq('id', batchId)
    .single();
  return data?.status === 'failed';
}

export async function runIcpDiscovery(pages: number, batchId: string, options: DiscoverOptions): Promise<void> {
  const supabase = getSupabaseAdmin();
  const env = getEnv();
  const apolloKey = env.APOLLO_API_KEY;

  if (!apolloKey) {
    await supabase.from('outreach_batches').update({ status: 'failed', notes: 'APOLLO_API_KEY not configured' }).eq('id', batchId);
    return;
  }

  const progress: BatchProgress = {
    phase: 'searching',
    currentPage: 0,
    totalPages: pages,
    candidatesFound: 0,
    candidatesChecked: 0,
    enriched: 0,
    enrichFailed: 0,
    dupes: 0,
    lowScore: 0,
    added: 0,
  };

  const pw = createProgressWriter(supabase, batchId);

  try {
    const titles = options.targetTitles;
    const minScore = options.minScore ?? 15;
    const employeeRanges = options.employeeRanges ?? [];
    const locations = options.locations ?? [];
    const industries = options.industries ?? [];

    const { data: existing } = await supabase
      .from('outreach_prospects')
      .select('apollo_person_id')
      .not('apollo_person_id', 'is', null);

    const seenIds = new Set((existing ?? []).map((r: { apollo_person_id: string }) => r.apollo_person_id));

    let pageError: string | null = null;
    let consecutiveEnrichFailures = 0;
    const ENRICH_FAILURE_LIMIT = 5;

    for (let page = 1; page <= pages; page++) {
      if (await isCancelled(supabase, batchId)) return;

      progress.currentPage = page;
      progress.phase = 'searching';
      await pw.flush(progress);

      let searchResults: ApolloSearchResult[] = [];
      try {
        const result = await discoverByIcp(apolloKey, {
          titles, employeeRanges, locations, industries, page, perPage: 25,
        });
        searchResults = result.people;
        progress.candidatesFound += searchResults.length;
        await pw.flush(progress);
      } catch (err) {
        pageError = err instanceof Error ? err.message : String(err);
        progress.phase = 'error';
        progress.error = pageError;
        await pw.flush(progress);
        break;
      }

      progress.phase = 'enriching';
      await pw.flush(progress);

      for (const candidate of searchResults) {
        if (progress.candidatesChecked % 5 === 0 && await isCancelled(supabase, batchId)) return;

        if (consecutiveEnrichFailures >= ENRICH_FAILURE_LIMIT) {
          const msg = `Apollo enrichment failed ${ENRICH_FAILURE_LIMIT} times in a row (credits exhausted or rate limited?)`;
          progress.phase = 'error';
          progress.error = msg;
          await pw.flush(progress);
          throw new Error(msg);
        }

        progress.candidatesChecked++;

        if (seenIds.has(candidate.id)) { progress.dupes++; pw.update(progress); continue; }
        seenIds.add(candidate.id);

        // Rate-limit enrichment calls — Apollo throttles after ~10-15/min
        await sleep(1000);

        const enriched = await enrichPerson(apolloKey, candidate.id);
        if (!enriched) {
          progress.enrichFailed++;
          consecutiveEnrichFailures++;
          pw.update(progress);
          continue;
        }
        consecutiveEnrichFailures = 0;
        progress.enriched++;

        const score = scoreProspect(enriched);
        if (score < minScore) { progress.lowScore++; pw.update(progress); continue; }

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
        progress.added++;
        progress.lastAdded = enriched.name;
        await pw.flush(progress);
      }
    }

    progress.phase = 'done';
    await pw.flush(progress);

    const notes = [
      `Discovery — ${pages} page(s)`,
      `${progress.candidatesFound} from Apollo`,
      progress.dupes > 0 ? `${progress.dupes} dupes` : null,
      progress.enrichFailed > 0 ? `${progress.enrichFailed} enrich-failed` : null,
      progress.lowScore > 0 ? `${progress.lowScore} low-score` : null,
      `${progress.added} added`,
      pageError ? `Apollo error: ${pageError}` : null,
    ].filter(Boolean).join(' · ');

    const status = pageError && progress.added === 0 ? 'failed' : 'complete';

    await supabase
      .from('outreach_batches')
      .update({ status, prospect_count: progress.added, completed_at: new Date().toISOString(), notes })
      .eq('id', batchId);
  } catch (err) {
    console.error('runIcpDiscovery failed:', err);
    progress.phase = 'error';
    progress.error = err instanceof Error ? err.message : 'Unknown error';
    await pw.flush(progress);
    await supabase
      .from('outreach_batches')
      .update({ status: 'failed', notes: `Error: ${progress.error}` })
      .eq('id', batchId);
  }
}

export async function runOutreachBatch(companies: string[], batchId: string, options: BatchOptions): Promise<void> {
  const supabase = getSupabaseAdmin();
  const env = getEnv();
  const apolloKey = env.APOLLO_API_KEY;

  if (!apolloKey) {
    await supabase.from('outreach_batches').update({ status: 'failed', notes: 'APOLLO_API_KEY not configured' }).eq('id', batchId);
    return;
  }

  const progress: BatchProgress = {
    phase: 'searching',
    totalCompanies: companies.length,
    companiesSearched: 0,
    candidatesFound: 0,
    candidatesChecked: 0,
    enriched: 0,
    enrichFailed: 0,
    dupes: 0,
    lowScore: 0,
    added: 0,
  };

  const pw = createProgressWriter(supabase, batchId);

  try {
    const titles = options.targetTitles;
    const minScore = options.minScore ?? 15;
    const minEmployees = options.minEmployees ?? 1;
    const maxEmployees = options.maxEmployees ?? 10000;
    const perPage = options.perPage ?? 10;

    for (const company of companies) {
      if (await isCancelled(supabase, batchId)) return;

      progress.currentCompany = company;
      progress.phase = 'searching';
      await pw.flush(progress);

      let searchResults: ApolloSearchResult[] = [];
      try {
        searchResults = await searchPeopleAtCompany(apolloKey, company, titles, perPage);
        progress.candidatesFound += searchResults.length;
      } catch (err) {
        console.error(`Apollo search failed for ${company}:`, err);
        progress.companiesSearched = (progress.companiesSearched ?? 0) + 1;
        pw.update(progress);
        continue;
      }

      progress.phase = 'enriching';
      await pw.flush(progress);

      for (const candidate of searchResults) {
        if (progress.candidatesChecked % 5 === 0 && await isCancelled(supabase, batchId)) return;

        progress.candidatesChecked++;

        await sleep(1000);

        const enriched = await enrichPerson(apolloKey, candidate.id);
        if (!enriched) { progress.enrichFailed++; pw.update(progress); continue; }
        progress.enriched++;

        const score = scoreProspect(enriched, minEmployees, maxEmployees);
        if (score < minScore) { progress.lowScore++; pw.update(progress); continue; }

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
        progress.added++;
        progress.lastAdded = enriched.name;
        await pw.flush(progress);
      }

      progress.companiesSearched = (progress.companiesSearched ?? 0) + 1;
    }

    progress.phase = 'done';
    await pw.flush(progress);

    await supabase
      .from('outreach_batches')
      .update({ status: 'complete', prospect_count: progress.added, completed_at: new Date().toISOString() })
      .eq('id', batchId);
  } catch (err) {
    console.error('runOutreachBatch failed:', err);
    progress.phase = 'error';
    progress.error = err instanceof Error ? err.message : 'Unknown error';
    await pw.flush(progress);
    await supabase
      .from('outreach_batches')
      .update({ status: 'failed', notes: `Error: ${progress.error}` })
      .eq('id', batchId);
  }
}
