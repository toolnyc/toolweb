import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/env';

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;

  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { prospect_id, action, contacted_at, contact_notes } = body as {
    prospect_id?: string;
    action?: string;
    contacted_at?: string;
    contact_notes?: string;
  };

  if (!prospect_id || !action) return json({ error: 'prospect_id and action required' }, 400);

  const validActions = ['approve', 'contacted', 'skip', 'decline'];
  if (!validActions.includes(action)) return json({ error: `Unknown action: ${action}` }, 400);

  const supabase = getSupabaseAdmin();

  const { data: prospect, error: fetchError } = await supabase
    .from('outreach_prospects')
    .select('id')
    .eq('id', prospect_id)
    .single();

  if (fetchError || !prospect) return json({ error: 'Prospect not found' }, 404);

  if (action === 'contacted') {
    await supabase
      .from('outreach_prospects')
      .update({
        status: 'contacted',
        contacted_at: contacted_at || new Date().toISOString(),
        contact_notes: contact_notes || null,
      })
      .eq('id', prospect_id);
    return json({ ok: true });
  }

  await supabase
    .from('outreach_prospects')
    .update({ status: action })
    .eq('id', prospect_id);
  return json({ ok: true });
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
