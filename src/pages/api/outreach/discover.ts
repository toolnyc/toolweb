import type { APIRoute } from 'astro';
import { runIcpDiscovery } from '../../../lib/outreach';

export const POST: APIRoute = async ({ request }) => {
  let pages = 2;

  try {
    const body = await request.json() as { pages?: unknown };
    if (typeof body.pages === 'number' && body.pages >= 1 && body.pages <= 5) {
      pages = body.pages;
    }
  } catch {
    // Use default pages if body is missing/invalid
  }

  try {
    const batchId = await runIcpDiscovery(pages);
    return new Response(JSON.stringify({ ok: true, batch_id: batchId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
