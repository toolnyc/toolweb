import type { APIRoute } from 'astro';
import { getSupabaseAdmin, getEnv, getOpenAIKey } from '../../lib/env';
import { transcribeAudio, analyzeIntent, buildInquiryRecord } from '../../lib/ai';
import type { ChatMessage } from '../../lib/ai';
import { sendInquiryNotificationEmail, sendInquiryAutoReplyEmail } from '../../lib/emails';

// Rate limiting: 3 new conversations per hour per IP
const rateLimit = new Map<string, { count: number; resetAt: number }>();

const MAX_MESSAGES = 5;
const MAX_CHAR_PER_MESSAGE = 2000;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB

export const POST: APIRoute = async ({ request }) => {
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
    console.error('ai-chat error:', err);
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

  // Rate limit on first message only (new conversation)
  if (messages.length <= 1) {
    const now = Date.now();
    const entry = rateLimit.get(ip);

    if (entry && entry.resetAt > now && entry.count >= 3) {
      return json({ error: 'Too many requests. Try again later.' }, 429);
    }

    if (!entry || entry.resetAt <= now) {
      rateLimit.set(ip, { count: 1, resetAt: now + 3600000 });
    } else {
      entry.count++;
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

  // Handle audio transcription
  if (body.audio) {
    const audioBuffer = base64ToArrayBuffer(body.audio);

    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      return json({ error: 'Audio too large (max 5MB)' }, 400);
    }

    const apiKey = getOpenAIKey();
    transcript = await transcribeAudio(audioBuffer, apiKey);

    // Replace or append the last user message with the transcript
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      messages[messages.length - 1].content = transcript;
    } else {
      messages.push({ role: 'user', content: transcript });
    }
  }

  // Run through Workers AI
  const env = getEnv();
  const ai = env.AI as { run: (model: string, input: Record<string, unknown>) => Promise<{ response?: string }> };

  if (!ai) {
    return json({ error: 'AI service unavailable' }, 503);
  }

  const { reply, extracted } = await analyzeIntent(messages, ai);

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

  const record = buildInquiryRecord({
    name,
    email,
    source: source === 'ai_voice' ? 'ai_voice' : 'ai_text',
    messages: messages ?? [],
    extracted: body.extracted as Parameters<typeof buildInquiryRecord>[0]['extracted'],
  });

  const supabaseAdmin = getSupabaseAdmin();
  const { error: insertError } = await supabaseAdmin
    .from('project_inquiries')
    .insert(record);

  if (insertError) {
    console.error('Error inserting AI inquiry:', insertError);
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
