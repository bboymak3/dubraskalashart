/**
 * Image Serving API - /api/images/[...key]
 * GET: Serve image from R2
 * Supports paths like: /api/images/dubraska/filename.jpg
 *                       /api/images/123456-abc123.jpg (uploaded)
 *
 * [...key] is a catch-all route that captures all path segments after /api/images/
 */

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

function handleOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const bucket = env.BUCKET;

  if (!bucket) return errorResponse('R2 storage not configured', 500);

  try {
    // [...key] gives us the full path after /api/images/ as a string
    // e.g. "dubraska/filename.jpg" or "123456-abc123.jpg"
    let key = params.key;

    if (!key) return errorResponse('Image key required', 400);

    // Handle array (shouldn't happen with [...key] but be safe)
    if (Array.isArray(key)) {
      key = key.join('/');
    }

    const object = await bucket.get(key);
    if (!object) return errorResponse('Image not found: ' + key, 404);

    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');

    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    } else {
      const ext = key.split('.').pop()?.toLowerCase();
      const types = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml'
      };
      headers.set('Content-Type', types[ext] || 'application/octet-stream');
    }

    return new Response(object.body, { headers });
  } catch (e) {
    return errorResponse('Error serving image: ' + e.message, 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}
