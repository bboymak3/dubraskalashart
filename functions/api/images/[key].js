/**
 * Image Serving API - /api/images/:key
 * GET: Serve image from R2
 * 
 * Keys are URL-encoded: "dubraska%2Ffilename.jpg"
 * The [key] param captures a single path segment.
 * We decode the key to get the actual R2 object key.
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
    let key = params.key;
    if (!key) return errorResponse('Image key required', 400);

    // The key may be URL-encoded (e.g., "dubraska%2Ffilename.jpg")
    // Cloudflare may or may not decode it, so try both
    const object = await bucket.get(key);
    
    // If not found, try decoding
    if (!object) {
      try {
        const decodedKey = decodeURIComponent(key);
        if (decodedKey !== key) {
          const decodedObject = await bucket.get(decodedKey);
          if (decodedObject) {
            return serveImage(decodedObject, decodedKey);
          }
        }
      } catch(e) {}
    }

    if (!object) return errorResponse('Image not found', 404);

    return serveImage(object, key);
  } catch (e) {
    return errorResponse('Error serving image: ' + e.message, 500);
  }
}

function serveImage(object, key) {
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
}

export async function onRequestOptions() {
  return handleOptions();
}
