import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/env';

export const POST: APIRoute = async ({ request }) => {
  let body: { prospect_id?: unknown; action?: unknown };

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { prospect_id, action } = body as {
    prospect_id?: string;
    action?: string;
  };

  if (!prospect_id || !action) return json({ error: 'prospect_id and action required' }, 400);

  const supabase = getSupabaseAdmin();

  // Load prospect to verify it exists
  const { data: prospect, error: fetchError } = await supabase
    .from('outreach_prospects')
    .select('*')
    .eq('id', prospect_id)
    .single();

  if (fetchError || !prospect) return json({ error: 'Prospect not found' }, 404);

  if (action === 'skip') {
    await supabase
      .from('outreach_prospects')
      .update({ status: 'skipped' })
      .eq('id', prospect_id);
    return json({ ok: true });
  }

  if (action === 'decline') {
    await supabase
      .from('outreach_prospects')
      .update({ status: 'declined' })
      .eq('id', prospect_id);
    return json({ ok: true });
  }

  if (action === 'approve') {
    await supabase
      .from('outreach_prospects')
      .update({ status: 'approved' })
      .eq('id', prospect_id);
    return json({ ok: true });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
