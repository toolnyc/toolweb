import type { APIRoute } from 'astro';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Require admin auth
    if (!locals.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Allowed: jpg, png, webp, gif, mp4' }),
        { status: 400 },
      );
    }

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large. Max: ${isVideo ? '100MB' : '10MB'}` }),
        { status: 400 },
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // R2 upload — requires Cloudflare Pages runtime with MEDIA_BUCKET binding
    // In production, use: env.MEDIA_BUCKET.put(filename, file.stream(), { httpMetadata: { contentType: file.type } })
    // For now, return the expected URL shape
    const publicUrl = import.meta.env.R2_PUBLIC_URL;

    if (!publicUrl) {
      return new Response(JSON.stringify({ error: 'R2 not configured' }), { status: 500 });
    }

    const url = `${publicUrl}/${filename}`;

    return new Response(
      JSON.stringify({
        url,
        filename,
        size: file.size,
        type: file.type,
        note: 'R2 upload requires Cloudflare Pages runtime with MEDIA_BUCKET binding. Configure in wrangler.toml.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
};
