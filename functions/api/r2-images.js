/**
 * R2 Images List API - /api/r2-images
 * GET: List all images in R2 under dubraska/ prefix
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

function handleOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  const bucket = env.BUCKET;

  if (!bucket) return jsonResponse({ error: 'R2 storage not configured' }, 500);

  try {
    const prefix = 'dubraska/';
    const listed = await bucket.list({ prefix, limit: 1000 });

    const images = listed.objects
      .filter(obj => obj.size > 0) // skip empty "folder" markers
      .filter(obj => {
        // Prefer .webp versions; skip .png/.jpg if a .webp exists
        const filename = obj.key.replace(prefix, '');
        const ext = filename.split('.').pop()?.toLowerCase();
        return ext === 'webp' || ext === 'png' || ext === 'jpg' || ext === 'jpeg';
      })
      .map(obj => {
        const key = obj.key;
        const filename = key.replace(prefix, '');
        const url = `/api/images/${encodeURIComponent(key)}`;
        const ext = filename.split('.').pop()?.toLowerCase();
        return {
          key,
          filename,
          url,
          size: obj.size,
          uploaded: obj.uploaded || obj.lastModified,
          type: ext
        };
      })
      // Deduplicate: prefer WebP over PNG/JPG with same base name
      .filter((obj, idx, arr) => {
        if (obj.type === 'webp') return true;
        const baseName = obj.filename.replace(/\.[^.]+$/, '');
        const hasWebp = arr.some(other => other.type === 'webp' && other.filename.replace(/\.[^.]+$/, '') === baseName);
        return !hasWebp;
      });

    return jsonResponse({ images, total: images.length });
  } catch (e) {
    return jsonResponse({ error: 'Error listing images: ' + e.message }, 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}
