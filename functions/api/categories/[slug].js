/**
 * Category Detail API - /api/categories/:slug
 * PUT: Update category (auth required)
 * DELETE: Delete category (auth required)
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

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const slug = params.slug;
    const body = await request.json();
    const { name, group_name } = body;

    const existing = await db.prepare('SELECT slug FROM categories WHERE slug = ?').bind(slug).first();
    if (!existing) return errorResponse('Category not found', 404);

    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (group_name) { updates.push('group_name = ?'); values.push(group_name); }

    if (updates.length === 0) return errorResponse('No fields to update', 400);

    values.push(slug);
    await db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE slug = ?`).bind(...values).run();

    return jsonResponse({ success: true, message: 'Category updated' });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const slug = params.slug;

    // Check if category has products
    const count = await db.prepare('SELECT COUNT(*) as cnt FROM products WHERE category = ?').bind(slug).first();
    if (count && count.cnt > 0) {
      return errorResponse(`Cannot delete: category has ${count.cnt} products. Move them first.`, 400);
    }

    await db.prepare('DELETE FROM categories WHERE slug = ?').bind(slug).run();

    return jsonResponse({ success: true, message: 'Category deleted' });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}
