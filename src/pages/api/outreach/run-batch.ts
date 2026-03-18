import type { APIRoute } from 'astro';
import { runOutreachBatch } from '../../../lib/outreach';

export const POST: APIRoute = async ({ request }) => {
  let companies: string[] = [];
  let targetTitles: string[] | undefined;
  let minScore: number | undefined;
  let minEmployees: number | undefined;
  let maxEmployees: number | undefined;
  let perPage: number | undefined;

  try {
    const body = await request.json() as {
      companies?: unknown;
      targetTitles?: unknown;
      minScore?: unknown;
      minEmployees?: unknown;
      maxEmployees?: unknown;
      perPage?: unknown;
    };
    if (!Array.isArray(body.companies)) {
      return new Response(JSON.stringify({ error: 'companies must be an array of strings' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    companies = (body.companies as unknown[])
      .map((c) => String(c).trim())
      .filter(Boolean);

    if (Array.isArray(body.targetTitles)) {
      targetTitles = (body.targetTitles as unknown[]).map((t) => String(t).trim()).filter(Boolean);
    }
    if (typeof body.minScore === 'number') minScore = body.minScore;
    if (typeof body.minEmployees === 'number') minEmployees = body.minEmployees;
    if (typeof body.maxEmployees === 'number') maxEmployees = body.maxEmployees;
    if (typeof body.perPage === 'number') perPage = Math.min(body.perPage, 25);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (companies.length === 0) {
    return new Response(JSON.stringify({ error: 'No companies provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (companies.length > 20) {
    return new Response(JSON.stringify({ error: 'Max 20 companies per batch' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const batchId = await runOutreachBatch(companies, { targetTitles, minScore, minEmployees, maxEmployees, perPage });
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
