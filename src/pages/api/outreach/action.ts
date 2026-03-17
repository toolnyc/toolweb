import type { APIRoute } from 'astro';
import { getSupabaseAdmin, getResendOrNull } from '../../../lib/env';

const FROM_ADDRESS = 'Pete <hello@tool.nyc>';
const REPLY_TO_ADDRESS = 'hugetool@proton.me';

export const POST: APIRoute = async ({ request }) => {
  let body: { prospect_id?: unknown; action?: unknown; subject?: unknown; body?: unknown };

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { prospect_id, action, subject, body: emailBody } = body as {
    prospect_id?: string;
    action?: string;
    subject?: string;
    body?: string;
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

  if (action === 'send') {
    if (!prospect.email) return json({ error: 'No email address for this prospect' }, 400);

    const finalSubject = subject ?? prospect.draft_subject ?? '(no subject)';
    const finalBody = emailBody ?? prospect.draft_body ?? '';

    const resend = getResendOrNull();
    if (!resend) return json({ error: 'Resend not configured' }, 500);

    let resendId: string | null = null;
    try {
      const result = await resend.emails.send({
        from: FROM_ADDRESS,
        replyTo: REPLY_TO_ADDRESS,
        to: [prospect.email as string],
        subject: finalSubject,
        text: finalBody,
      });
      resendId = result.data?.id ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      return json({ error: msg }, 500);
    }

    // Record the sent message
    await supabase.from('outreach_messages').insert({
      prospect_id,
      subject: finalSubject,
      body: finalBody,
      resend_message_id: resendId,
    });

    await supabase
      .from('outreach_prospects')
      .update({ status: 'sent' })
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
