import { getSupabaseAdminOrNull } from './env';
import { sendPushNotification } from './notify';

type LogLevel = 'critical' | 'error' | 'warn';

interface LogContext {
  path?: string;
  [key: string]: unknown;
}

let _ctx: ExecutionContext | null = null;

export function setExecutionContext(ctx: ExecutionContext): void {
  _ctx = ctx;
}

/**
 * Fire-and-forget: enqueue via waitUntil so it never blocks the response.
 */
function enqueue(fn: () => Promise<void>): void {
  const promise = fn().catch(() => {});
  if (_ctx) {
    _ctx.waitUntil(promise);
  }
}

export function logError(
  level: LogLevel,
  message: string,
  context: LogContext = {},
): void {
  // Always log to console as baseline
  const tag = `[${level}]`;
  if (level === 'warn') {
    console.warn(tag, message, context);
  } else {
    console.error(tag, message, context);
  }

  enqueue(async () => {
    const supabase = getSupabaseAdminOrNull();
    if (!supabase) return;

    // Extract stack from context if it's an Error
    let stack: string | undefined;
    if (context.error instanceof Error) {
      stack = context.error.stack;
      context = { ...context, error: context.error.message };
    }

    await supabase.from('error_logs').insert({
      level,
      message,
      context,
      stack,
      path: context.path,
    });

    // Push notification for critical errors
    if (level === 'critical') {
      const body = context.path
        ? `${message} (${context.path})`
        : message;
      await sendPushNotification('Critical Error', body, 'urgent');
    }
  });
}

export function logEvent(
  eventType: 'page_view' | 'api_call',
  details: {
    path: string;
    method?: string;
    statusCode?: number;
    durationMs?: number;
    country?: string;
    userAgent?: string;
  },
): void {
  enqueue(async () => {
    const supabase = getSupabaseAdminOrNull();
    if (!supabase) return;

    await supabase.from('analytics_events').insert({
      event_type: eventType,
      path: details.path,
      method: details.method || 'GET',
      status_code: details.statusCode,
      duration_ms: details.durationMs,
      country: details.country,
      user_agent: details.userAgent?.slice(0, 512),
    });
  });
}
