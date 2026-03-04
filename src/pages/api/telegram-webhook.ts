import type { APIRoute } from 'astro';
import type { TelegramUpdate } from '../../lib/telegram/types';
import { handleCommand } from '../../lib/telegram/commands';
import { getEnv } from '../../lib/env';
import { logError } from '../../lib/logger';

export const POST: APIRoute = async ({ request, locals }) => {
  const ctx = locals.runtime.ctx;
  const env = getEnv();

  const botToken = (env.TELEGRAM_CONTENT_BOT_TOKEN as string) || env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET as string | undefined;

  if (!botToken || !chatId) {
    return new Response('Not configured', { status: 503 });
  }

  // Verify webhook secret (Telegram sends it in X-Telegram-Bot-Api-Secret-Token header)
  if (webhookSecret) {
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
    if (headerSecret !== webhookSecret) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Only process text messages from the authorized chat
  const message = update.message;
  if (!message?.text || String(message.chat.id) !== chatId) {
    return new Response('OK', { status: 200 });
  }

  // Only process commands (messages starting with /)
  if (!message.text.startsWith('/')) {
    return new Response('OK', { status: 200 });
  }

  // Process command in background via waitUntil
  const openaiKey = env.OPENAI_API_KEY ?? '';

  ctx.waitUntil(
    handleCommand(message.text, {
      botToken,
      chatId,
      openaiKey,
    }).catch((err) => {
      logError('error', 'Telegram command error', {
        path: '/api/telegram-webhook',
        command: message.text,
        error: err,
      }, ctx);
    }),
  );

  // Return 200 immediately so Telegram doesn't retry
  return new Response('OK', { status: 200 });
};
