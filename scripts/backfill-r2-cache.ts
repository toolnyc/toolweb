/**
 * One-time migration: add Cache-Control headers to all existing R2 objects.
 *
 * This is a standalone Cloudflare Worker that runs against the real MEDIA_BUCKET
 * binding using your existing wrangler auth — no extra API keys needed.
 *
 * Usage:
 *   npx wrangler dev scripts/backfill-r2-cache.ts --remote
 *   # Then visit http://localhost:8787 once in your browser
 *   # Ctrl-C when done
 *
 * Safe to run multiple times — skips objects that already have the correct header.
 */

interface Env {
  MEDIA_BUCKET: R2Bucket;
}

const TARGET = 'public, max-age=31536000, immutable';

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    const bucket = env.MEDIA_BUCKET;
    if (!bucket) {
      return new Response('MEDIA_BUCKET binding not found', { status: 500 });
    }

    const lines: string[] = [];
    let updated = 0;
    let skipped = 0;
    let cursor: string | undefined;

    do {
      const list = await bucket.list({ limit: 500, cursor });

      for (const obj of list.objects) {
        const head = await bucket.head(obj.key);
        if (!head) continue;

        if (head.httpMetadata?.cacheControl === TARGET) {
          skipped++;
          lines.push(`skip: ${obj.key}`);
          continue;
        }

        // Re-put with updated metadata — streams body through the Worker
        const body = await bucket.get(obj.key);
        if (!body) continue;

        await bucket.put(obj.key, body.body, {
          httpMetadata: {
            ...head.httpMetadata,
            cacheControl: TARGET,
          },
          customMetadata: head.customMetadata,
        });

        updated++;
        lines.push(`updated: ${obj.key} (${(obj.size / 1024 / 1024).toFixed(1)} MB)`);
      }

      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);

    lines.push('', `Done. Updated: ${updated}, Already correct: ${skipped}`);
    return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain' } });
  },
};
