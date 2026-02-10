import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { setAuthCookies } from '../../../lib/cookies';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'Auth not configured' }), { status: 500 });
    }

    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return redirect('/admin/login');
    }

    setAuthCookies(cookies, data.session.access_token, data.session.refresh_token);
    return redirect('/admin');
  } catch {
    return redirect('/admin/login');
  }
};
