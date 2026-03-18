import type { APIRoute } from 'astro';
import { runIcpDiscovery } from '../../../lib/outreach';
import { getSupabaseAdmin } from '../../../lib/env';

export const POST: APIRoute = async ({ request, locals }) => {
  let pages = 2;

  try {
    const body = await request.json() as { pages?: unknown };
    if (typeof body.pages === 'number' && body.pages >= 1 && body.pages <= 5) {
      pages = body.pages;
    }
  } catch {
    // Use default pages if body is missing/invalid
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

  const runtime = (locals as unknown as Record<string, unknown>).runtime as { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } | undefined;
  const waitUntil = runtime?.ctx?.waitUntil?.bind(runtime.ctx);

  if (waitUntil) {
    waitUntil(runIcpDiscovery(pages, batchId));
  } else {
    // Dev fallback — await synchronously
    try {
      await runIcpDiscovery(pages, batchId);
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
