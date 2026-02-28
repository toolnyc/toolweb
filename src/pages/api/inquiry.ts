import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../lib/env';
import { sendInquiryNotificationEmail, sendInquiryAutoReplyEmail } from '../../lib/emails';
import { logError } from '../../lib/logger';

// Simple in-memory rate limiting (per IP, 5 per hour)
const rateLimit = new Map<string, { count: number; resetAt: number }>();

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Rate limiting
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const entry = rateLimit.get(ip);

    if (entry && entry.resetAt > now && entry.count >= 5) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
    }

    if (!entry || entry.resetAt <= now) {
      rateLimit.set(ip, { count: 1, resetAt: now + 3600000 });
    } else {
      entry.count++;
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const company = formData.get('company') as string | null;
    const project_type = formData.get('project_type') as string | null;
    const description = formData.get('description') as string;
    const budget_range = formData.get('budget_range') as string | null;
    const timeline = formData.get('timeline') as string | null;

    if (!name || !email || !description) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and description are required' }),
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
    }

    if (name.length > 200 || description.length > 5000) {
      return new Response(JSON.stringify({ error: 'Input too long' }), { status: 400 });
    }

    // Insert inquiry
    const { error: insertError } = await supabaseAdmin
      .from('project_inquiries')
      .insert({ name, email, company, project_type, description, budget_range, timeline });

    if (insertError) {
      logError('error', 'Error inserting inquiry', { path: '/api/inquiry', error: insertError });
      return new Response(JSON.stringify({ error: 'Failed to submit' }), { status: 500 });
    }

    // Send branded notification email to admin and auto-reply to submitter
    await Promise.allSettled([
      sendInquiryNotificationEmail({
        name,
        email,
        company: company || undefined,
        message: description,
        budget: budget_range || undefined,
        timeline: timeline || undefined,
      }),
      sendInquiryAutoReplyEmail(email, name),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500 });
  }
};
