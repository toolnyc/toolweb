import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'Auth not configured' }), { status: 500 });
    }

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

    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';

    await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/api/auth/callback`,
      },
    });

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
