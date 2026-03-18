import type { APIRoute } from 'astro';
import { runOutreachBatch, type BatchOptions } from '../../../lib/outreach';
import { getSupabaseAdmin } from '../../../lib/env';

export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, unknown>;

  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { companies: rawCompanies, targetTitles, minScore, minEmployees, maxEmployees, perPage: rawPerPage } = body as {
    companies?: unknown;
    targetTitles?: unknown;
    minScore?: unknown;
    minEmployees?: unknown;
    maxEmployees?: unknown;
    perPage?: unknown;
  };

  if (!Array.isArray(rawCompanies)) {
    return json({ error: 'companies must be an array of strings' }, 400);
  }

  const companies = (rawCompanies as unknown[])
    .map((c) => String(c).trim())
    .filter(Boolean);

  if (companies.length === 0) {
    return json({ error: 'No companies provided' }, 400);
  }

  if (companies.length > 20) {
    return json({ error: 'Max 20 companies per batch' }, 400);
  }

  const options: BatchOptions = {};
  if (Array.isArray(targetTitles) && targetTitles.length > 0) {
    options.targetTitles = (targetTitles as unknown[]).map(String).filter(Boolean);
  }
  if (typeof minScore === 'number') options.minScore = minScore;
  if (typeof minEmployees === 'number') options.minEmployees = minEmployees;
  if (typeof maxEmployees === 'number') options.maxEmployees = maxEmployees;
  if (typeof rawPerPage === 'number') options.perPage = Math.min(25, rawPerPage);

  const supabase = getSupabaseAdmin();
  const { data: batch, error: batchError } = await supabase
    .from('outreach_batches')
    .insert({
      status: 'running',
      visitor_count: companies.length,
    })
    .select()
    .single();

  if (batchError || !batch) {
    return json({ error: `Failed to create batch: ${batchError?.message ?? 'unknown'}` }, 500);
  }

  const batchId = batch.id as string;

  const runtime = (locals as unknown as Record<string, unknown>).runtime as { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } | undefined;
  const waitUntil = runtime?.ctx?.waitUntil?.bind(runtime.ctx);

  if (waitUntil) {
    waitUntil(runOutreachBatch(companies, batchId, options));
  } else {
    // Dev fallback — await synchronously
    try {
      await runOutreachBatch(companies, batchId, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return json({ error: message }, 500);
    }
  }

  return json({ ok: true, batch_id: batchId });
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
