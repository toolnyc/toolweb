import type { APIRoute } from 'astro';
import { getSupabaseAdmin, getEnv } from '../../../lib/env';
import { sendMagicLinkEmail } from '../../../lib/emails';

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const formData = await request.formData();
    const email = formData.get('email') as string;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 });
    }

    // Verify email exists in clients table before sending
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('email', email)
      .single();

    // Always return success to avoid leaking whether email exists
    if (!client) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = getEnv().PUBLIC_SITE_URL || 'http://localhost:4321';

    // Use generateLink to get the magic link URL without Supabase sending its own email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${siteUrl}/api/auth/callback`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Failed to generate magic link:', linkError);
      // Still return success to avoid leaking info
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send branded email via Resend
    await sendMagicLinkEmail(email, linkData.properties.action_link);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
