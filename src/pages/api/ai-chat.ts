import type { APIRoute } from 'astro';
import { getSupabaseAdmin, getOpenAIKey } from '../../lib/env';
import { transcribeAudio, analyzeIntent, buildInquiryRecord } from '../../lib/ai';
import type { ChatMessage } from '../../lib/ai';
import { sendInquiryNotificationEmail, sendInquiryAutoReplyEmail } from '../../lib/emails';
import { logError } from '../../lib/logger';
import { checkRateLimit } from '../../lib/rate-limit';

const MAX_MESSAGES = 10;
const MAX_CHAR_PER_MESSAGE = 2000;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB
const RATE_LIMIT_WINDOW_HOURS = 1;
const RATE_LIMIT_MAX_INQUIRIES = 3;

export const POST: APIRoute = async ({ request, locals }) => {
  const ctx = locals.runtime.ctx;
  try {
    const body = await request.json() as {
      action: 'chat' | 'submit';
      messages?: ChatMessage[];
      audio?: string; // base64
      name?: string;
      email?: string;
      source?: 'ai_voice' | 'ai_text';
      extracted?: Record<string, unknown> | null;
    };

    const { action } = body;

    if (action === 'chat') {
      return handleChat(request, body);
    } else if (action === 'submit') {
      return handleSubmit(body);
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (err) {
    logError('error', 'ai-chat error', { path: '/api/ai-chat', error: err }, ctx);
    return json({ error: 'Unexpected error' }, 500);
  }
};

async function handleChat(
  request: Request,
  body: {
    messages?: ChatMessage[];
    audio?: string;
  },
) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const messages = body.messages ?? [];

  // Rate limit: 10 conversations/hour/IP (checked on first message only)
  if (messages.length <= 1) {
    const { allowed } = await checkRateLimit(ip, {
      maxRequests: 10,
      windowSeconds: 3600,
      endpoint: 'ai-chat',
    });

    if (!allowed) {
      return json({ error: 'Too many requests. Try again later.' }, 429);
    }
  }

  // Daily cap: 30 conversations/day/IP
  if (messages.length <= 1) {
    const { allowed } = await checkRateLimit(ip, {
      maxRequests: 30,
      windowSeconds: 86400,
      endpoint: 'ai-chat-daily',
    });

    if (!allowed) {
      return json({ error: 'Daily limit reached. Come back tomorrow.' }, 429);
    }
  }

  // Validate message count
  if (messages.length > MAX_MESSAGES) {
    return json({ error: 'Conversation limit reached' }, 400);
  }

  // Validate message lengths
  for (const msg of messages) {
    if (msg.content.length > MAX_CHAR_PER_MESSAGE) {
      return json({ error: 'Message too long' }, 400);
    }
  }

  let transcript: string | undefined;

  const apiKey = getOpenAIKey();

  // Handle audio transcription
  if (body.audio) {
    const audioBuffer = base64ToArrayBuffer(body.audio);

    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      return json({ error: 'Audio too large (max 5MB)' }, 400);
    }

    transcript = await transcribeAudio(audioBuffer, apiKey);

    // Replace or append the last user message with the transcript
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      messages[messages.length - 1].content = transcript;
    } else {
      messages.push({ role: 'user', content: transcript });
    }
  }

  // Run through OpenAI GPT-4o
  const { reply, extracted } = await analyzeIntent(messages, apiKey);

  return json({ reply, extracted, transcript });
}

async function handleSubmit(body: {
  name?: string;
  email?: string;
  source?: 'ai_voice' | 'ai_text';
  messages?: ChatMessage[];
  extracted?: Record<string, unknown> | null;
}) {
  const { name, email, source, messages } = body;

  if (!name || !email) {
    return json({ error: 'Name and email are required' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: 'Invalid email address' }, 400);
  }

  if (name.length > 200) {
    return json({ error: 'Name too long' }, 400);
  }

  // Rate limit: max 3 inquiries per email per hour (persisted in DB)
  const supabaseAdmin = getSupabaseAdmin();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 3600000).toISOString();
  const { count } = await supabaseAdmin
    .from('project_inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', windowStart);

  if (count !== null && count >= RATE_LIMIT_MAX_INQUIRIES) {
    return json({ error: 'Too many inquiries. Please try again later.' }, 429);
  }

  const record = buildInquiryRecord({
    name,
    email,
    source: source === 'ai_voice' ? 'ai_voice' : 'ai_text',
    messages: messages ?? [],
    extracted: body.extracted as Parameters<typeof buildInquiryRecord>[0]['extracted'],
  });

  const { error: insertError } = await supabaseAdmin
    .from('project_inquiries')
    .insert(record);

  if (insertError) {
    logError('error', 'Error inserting AI inquiry', { path: '/api/ai-chat', error: insertError });
    return json({ error: 'Failed to save inquiry' }, 500);
  }

  // Fire notification emails (non-blocking)
  await Promise.allSettled([
    sendInquiryNotificationEmail({
      name,
      email,
      message: record.description,
      budget: record.budget_range ?? undefined,
      timeline: record.timeline ?? undefined,
    }),
    sendInquiryAutoReplyEmail(email, name),
  ]);

  // Build Cal.com prefill data
  const calNotes = record.ai_summary
    ? `AI Summary: ${record.ai_summary}\nSource: ${record.source}`
    : `Source: ${record.source}`;

  return json({
    success: true,
    calPrefill: { name, email, notes: calNotes },
  });
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Strip data URL prefix if present
  const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
