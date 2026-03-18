import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/env';

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: batch, error } = await supabase
    .from('outreach_batches')
    .select('status, prospect_count, completed_at')
    .eq('id', id)
    .single();

  if (error || !batch) {
    return new Response(JSON.stringify({ error: 'Batch not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      status: batch.status as string,
      prospect_count: batch.prospect_count as number,
      completed_at: batch.completed_at as string | null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
