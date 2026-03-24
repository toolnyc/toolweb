import type { APIRoute } from 'astro';
import { runIcpDiscovery, type DiscoverOptions } from '../../../lib/outreach';
import { getSupabaseAdmin } from '../../../lib/env';

export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { pages: rawPages, targetTitles, minScore, employeeRanges, locations, industries } = body as {
    pages?: unknown;
    targetTitles?: unknown;
    minScore?: unknown;
    employeeRanges?: unknown;
    locations?: unknown;
    industries?: unknown;
  };

  // Titles are required — no defaults
  if (!Array.isArray(targetTitles) || targetTitles.length === 0) {
    return json({ error: 'targetTitles is required (array of title strings)' }, 400);
  }

  const pages = (typeof rawPages === 'number' && rawPages >= 1 && rawPages <= 5) ? rawPages : 2;

  const options: DiscoverOptions = {
    targetTitles: (targetTitles as unknown[]).map(String).filter(Boolean),
  };
  if (typeof minScore === 'number') options.minScore = minScore;
  if (Array.isArray(employeeRanges) && employeeRanges.length > 0) {
    options.employeeRanges = (employeeRanges as unknown[]).map(String).filter(Boolean);
  }
  if (Array.isArray(locations) && locations.length > 0) {
    options.locations = (locations as unknown[]).map(String).filter(Boolean);
  }
  if (Array.isArray(industries) && industries.length > 0) {
    options.industries = (industries as unknown[]).map(String).filter(Boolean);
  }

  const supabase = getSupabaseAdmin();
  const { data: batch, error: batchError } = await supabase
    .from('outreach_batches')
    .insert({
      status: 'running',
      visitor_count: 0,
      notes: `Discovery — ${pages} page(s)`,
    })
    .select()
    .single();

  if (batchError || !batch) {
    return json({ error: `Failed to create batch: ${batchError?.message ?? 'unknown'}` }, 500);
  }

  const batchId = batch.id as string;
  locals.runtime.ctx.waitUntil(runIcpDiscovery(pages, batchId, options));

  return json({ ok: true, batch_id: batchId });
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
