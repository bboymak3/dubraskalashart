/**
 * Upload API - /api/upload
 * POST: Upload image to R2 (auth required)
 */
import { jsonResponse, errorResponse, handleOptions, validateAuth } from '../../lib.js';

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

    // Generate unique key
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const key = `${timestamp}-${random}.${ext}`;

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
