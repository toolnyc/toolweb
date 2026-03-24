import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/env';

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const batchId = body.batch_id as string | undefined;
  if (!batchId) return json({ error: 'batch_id required' }, 400);

  const supabase = getSupabaseAdmin();

  const { data: batch, error: fetchError } = await supabase
    .from('outreach_batches')
    .select('id, status')
    .eq('id', batchId)
    .single();

  if (fetchError || !batch) return json({ error: 'Batch not found' }, 404);
  if (batch.status !== 'running') return json({ error: 'Batch is not running' }, 400);

  await supabase
    .from('outreach_batches')
    .update({ status: 'failed', notes: 'Cancelled by user' })
    .eq('id', batchId);

  return json({ ok: true });
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
