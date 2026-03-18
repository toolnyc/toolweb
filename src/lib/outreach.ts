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
  confidence_score: number;
  draft_subject: string | null;
  draft_body: string | null;
}

function scoreProspect(person: ApolloPerson, minEmployees: number = 10, maxEmployees: number = 300): number {
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
  const midpoint = minEmployees + (maxEmployees - minEmployees) / 5;
  if (employees >= minEmployees && employees <= midpoint) score += 20;
  else if (employees > midpoint && employees <= maxEmployees) score += 10;

  return Math.min(score, 100);
}

async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}: ${await response.text()}`);
  }

  const result = await response.json() as { choices: Array<{ message: { content: string } }> };
  return result.choices[0]?.message?.content?.trim() ?? '';
}

async function draftEmail(
  apiKey: string,
  person: ApolloPerson,
): Promise<{ subject: string; body: string }> {
  const system = `You write cold outreach emails for Pete, a one-person creative and technical consultancy in New York called Tool (tool.nyc).

Voice rules (non-negotiable):
- Short. 3–4 sentences max for the body. Subject: 5 words or fewer.
- Direct and specific. No generic flattery. No "I came across your profile."
- One concrete observation about why you're reaching out to this person specifically.
- One clear capability statement relevant to them.
- End with a simple, low-friction ask (a quick call, not a "partnership").
- Never: "excited to," "leveraging," "cutting-edge," "we" (it's one person), exclamation marks.
- Never mention Tool.nyc — sign off as Pete, not Pete from Tool.
- The email should read like it came from a real person who did 5 minutes of research, not a form letter.

Reply with JSON only: { "subject": "...", "body": "..." }`;

  const user = `Draft a cold outreach email to:
Name: ${person.name}
Title: ${person.title ?? 'unknown'}
Company: ${person.organization?.name ?? 'unknown'}
Industry: ${person.organization?.industry ?? 'unknown'}
Company size: ${person.organization?.estimated_num_employees ?? 'unknown'} employees
Company description: ${person.organization?.short_description ?? 'none'}`;

  const raw = await callOpenAI(apiKey, system, user);

  try {
    const parsed = JSON.parse(raw) as { subject?: string; body?: string };
    return {
      subject: parsed.subject ?? '',
      body: parsed.body ?? '',
    };
  } catch {
    return { subject: '', body: raw };
  }
}

export interface BatchOptions {
  targetTitles?: string[];
  minScore?: number;
  minEmployees?: number;
  maxEmployees?: number;
  perPage?: number;
}

/**
 * Run the outreach pipeline for a list of company names.
 * Writes results to outreach_batches + outreach_prospects.
 * Returns the batch ID.
 */
export async function runOutreachBatch(companies: string[], options?: BatchOptions): Promise<string> {
  const supabase = getSupabaseAdmin();
  const env = getEnv();
  const apolloKey = env.APOLLO_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;

  if (!apolloKey) throw new Error('APOLLO_API_KEY not configured');
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

  const titles = options?.targetTitles ?? TARGET_TITLES;
  const minScore = options?.minScore ?? 30;
  const minEmployees = options?.minEmployees ?? 10;
  const maxEmployees = options?.maxEmployees ?? 300;
  const perPage = options?.perPage ?? 10;

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
      people = await searchPeopleAtCompany(apolloKey, company, titles, perPage);
    } catch (err) {
      console.error(`Apollo search failed for ${company}:`, err);
      continue;
    }

    for (const person of people) {
      const score = scoreProspect(person, minEmployees, maxEmployees);
      if (score < minScore) continue;

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

      // Draft email for prospects likely to have email contact
      let draftSubject: string | null = null;
      let draftBody: string | null = null;
      if (score >= 40) {
        try {
          const draft = await draftEmail(openaiKey, enriched);
          draftSubject = draft.subject;
          draftBody = draft.body;
        } catch (err) {
          console.error(`Draft failed for ${person.name}:`, err);
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
        confidence_score: score,
        draft_subject: draftSubject,
        draft_body: draftBody,
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
