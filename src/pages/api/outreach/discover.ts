import type { APIRoute } from 'astro';
import { runIcpDiscovery, type IcpOptions } from '../../../lib/outreach';
import { getSupabaseAdmin } from '../../../lib/env';

export const POST: APIRoute = async ({ request, locals }) => {
  let pages = 2;
  const options: IcpOptions = {};

  try {
    const body = await request.json() as { pages?: unknown; targetTitles?: unknown; minScore?: unknown };
    if (typeof body.pages === 'number' && body.pages >= 1 && body.pages <= 5) {
      pages = body.pages;
    }
    if (Array.isArray(body.targetTitles) && body.targetTitles.length > 0) {
      options.targetTitles = (body.targetTitles as unknown[]).map(String).filter(Boolean);
    }
    if (typeof body.minScore === 'number') options.minScore = body.minScore;
  } catch {
    // Use defaults if body is missing/invalid
  }

  const supabase = getSupabaseAdmin();
  const { data: batch, error: batchError } = await supabase
    .from('outreach_batches')
    .insert({
      status: 'running',
      visitor_count: 0,
      notes: `ICP discovery — ${pages} page(s)`,
    })
    .select()
    .single();

  if (batchError || !batch) {
    return json({ error: `Failed to create batch: ${batchError?.message ?? 'unknown'}` }, 500);
  }

  const batchId = batch.id as string;

  // Use the same ctx pattern as middleware.ts and telegram-webhook.ts
  locals.runtime.ctx.waitUntil(runIcpDiscovery(pages, batchId, options));

  return json({ ok: true, batch_id: batchId });
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
