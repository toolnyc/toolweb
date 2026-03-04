import { getEnv } from './env';

export async function sendPushNotification(
  title: string,
  body: string,
  priority: 'urgent' | 'high' | 'default' = 'urgent',
): Promise<void> {
  const topic = (getEnv().NTFY_TOPIC as string) || '';
  if (!topic) return;

  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        Title: title,
        Priority: priority,
        Tags: priority === 'urgent' ? 'rotating_light' : 'warning',
      },
      body,
    });
  } catch {
    // Fire-and-forget — don't let notification failures cascade
  }
}

export interface InquiryNotification {
  source: 'form' | 'ai_chat';
  name: string;
  email: string;
  company?: string;
  projectType?: string;
  budget?: string;
  timeline?: string;
  message?: string;
}

export async function sendTelegramNotification(inquiry: InquiryNotification): Promise<void> {
  const env = getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const icon = inquiry.source === 'ai_chat' ? '🤖' : '📬';
  const label = inquiry.source === 'ai_chat' ? 'AI Chat' : 'Inquiry Form';

  const lines = [
    `${icon} <b>New Lead — ${label}</b>`,
    ``,
    `<b>Name:</b> ${escapeHtml(inquiry.name)}`,
    `<b>Email:</b> ${escapeHtml(inquiry.email)}`,
  ];

  if (inquiry.company) lines.push(`<b>Company:</b> ${escapeHtml(inquiry.company)}`);
  if (inquiry.projectType) lines.push(`<b>Type:</b> ${escapeHtml(inquiry.projectType)}`);
  if (inquiry.budget) lines.push(`<b>Budget:</b> ${escapeHtml(inquiry.budget)}`);
  if (inquiry.timeline) lines.push(`<b>Timeline:</b> ${escapeHtml(inquiry.timeline)}`);
  if (inquiry.message) {
    const truncated = inquiry.message.length > 300
      ? inquiry.message.slice(0, 300) + '...'
      : inquiry.message;
    lines.push(``, `<b>Message:</b>`, escapeHtml(truncated));
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
      }),
    });
  } catch {
    // Fire-and-forget
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
