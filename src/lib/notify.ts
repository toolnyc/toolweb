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
