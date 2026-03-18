import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/env';

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id required' }, 400);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('outreach_batches')
    .select('status, prospect_count, completed_at, notes')
    .eq('id', id)
    .single();

  if (error || !data) return json({ error: 'Batch not found' }, 404);
  return json(data as Record<string, unknown>);
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
