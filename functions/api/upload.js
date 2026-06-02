/**
 * Upload API - /api/upload
 * POST: Upload image to R2 (auth required)
 */

// === SHARED UTILITIES (inline) ===
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
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

async function validateAuth(request, db) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Authorization required' };
  }
  const token = authHeader.slice(7);
  if (!token || token.length < 10) {
    return { valid: false, error: 'Invalid token' };
  }
  try {
    const session = await db.prepare(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    ).bind(token).first();
    if (!session) {
      return { valid: false, error: 'Session expired. Please login again.' };
    }
    return { valid: true, token };
  } catch (e) {
    return { valid: false, error: 'Auth error: ' + e.message };
  }
}
// === END SHARED UTILITIES ===

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) return errorResponse('No image file provided', 400);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return errorResponse('Only image files are allowed', 400);
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return errorResponse('Image must be under 5MB', 400);
    }

    // Generate unique key under dubraska/ prefix
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const key = `dubraska/${timestamp}-${random}.${ext}`;

    // Upload to R2
    const bucket = env.BUCKET;
    if (!bucket) return errorResponse('R2 storage not configured', 500);

    const arrayBuffer = await file.arrayBuffer();
    await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      }
    });

    // Return the URL path for serving
    const imageUrl = `/api/images/${key}`;

    return jsonResponse({
      success: true,
      key,
      url: imageUrl,
      message: 'Image uploaded successfully'
    }, 201);
  } catch (e) {
    return errorResponse('Upload error: ' + e.message, 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}
