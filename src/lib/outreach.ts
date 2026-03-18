import { searchPeopleAtCompany, enrichPerson, type ApolloPerson } from './apollo';
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

function scoreProspect(person: ApolloPerson): number {
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

  // Company size sweet spot (10–300 employees — solo op clientele)
  const employees = person.organization?.estimated_num_employees ?? 0;
  if (employees >= 10 && employees <= 50) score += 20;
  else if (employees > 50 && employees <= 300) score += 10;

  return Math.min(score, 100);
}

/**
 * Run the outreach pipeline for a list of company names.
 * Writes results to outreach_batches + outreach_prospects.
 * Returns the batch ID.
 */
export async function runOutreachBatch(companies: string[]): Promise<string> {
  const supabase = getSupabaseAdmin();
  const env = getEnv();
  const apolloKey = env.APOLLO_API_KEY;

  if (!apolloKey) throw new Error('APOLLO_API_KEY not configured');

  // Create batch record
  const { data: batch, error: batchError } = await supabase
    .from('outreach_batches')
    .insert({
      status: 'running',
      visitor_count: companies.length,
    })
    .select()
    .single();

  if (batchError || !batch) throw new Error(`Failed to create batch: ${batchError?.message}`);

  const batchId = batch.id as string;
  let totalProspects = 0;

  for (const company of companies) {
    let people: ApolloPerson[] = [];
    try {
      people = await searchPeopleAtCompany(apolloKey, company, TARGET_TITLES);
    } catch (err) {
      console.error(`Apollo search failed for ${company}:`, err);
      continue;
    }

    for (const person of people) {
      const score = scoreProspect(person);
      if (score < 30) continue;

      // Enrich high-confidence prospects to get verified email
      let enriched = person;
      if (score >= 55 && !person.email && person.id) {
        try {
          const result = await enrichPerson(apolloKey, person.id);
          if (result) enriched = result;
        } catch {
          // Non-fatal — proceed with what we have
        }
      }

      const org = enriched.organization;
      const prospect: ProspectDraft = {
        apollo_person_id: enriched.id,
        name: enriched.name,
        title: enriched.title,
        company: org?.name ?? company,
        email: enriched.email,
        linkedin_url: enriched.linkedin_url,
        signal: `Visited tool.nyc — company: ${company}`,
        company_size: org?.estimated_num_employees != null
          ? String(org.estimated_num_employees)
          : null,
        company_industry: org?.industry ?? null,
        company_description: org?.short_description ?? null,
        confidence_score: score,
        draft_subject: null,
        draft_body: null,
      };

      await supabase.from('outreach_prospects').insert({
        batch_id: batchId,
        ...prospect,
      });

      totalProspects++;
    }
  }

  // Mark batch complete
  await supabase
    .from('outreach_batches')
    .update({
      status: 'complete',
      prospect_count: totalProspects,
      completed_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  return batchId;
}
