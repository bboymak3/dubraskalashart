/**
 * Products API - /api/products
 * GET: List products (with filters)
 * POST: Create product (auth required)
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

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || 'sort_order';
    const ids = url.searchParams.get('ids');

    // Get specific products by IDs (for cart)
    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (idList.length === 0) return jsonResponse([]);

      const placeholders = idList.map(() => '?').join(',');
      const result = await db.prepare(
        `SELECT id, name, price, category, image, description as desc FROM products WHERE id IN (${placeholders})`
      ).bind(...idList).all();

      return jsonResponse(result.results || []);
    }

    let query = 'SELECT id, name, price, category, image, description as desc FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sort
    switch (sort) {
      case 'price-low': query += ' ORDER BY price ASC'; break;
      case 'price-high': query += ' ORDER BY price DESC'; break;
      case 'name-az': query += ' ORDER BY name ASC'; break;
      case 'name-za': query += ' ORDER BY name DESC'; break;
      default: query += ' ORDER BY sort_order ASC, id ASC';
    }

    const result = await db.prepare(query).bind(...params).all();
    return jsonResponse(result.results || []);
  } catch (e) {
    return errorResponse('Error fetching products: ' + e.message, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const body = await request.json();
    const { name, price, category, image, description } = body;

    if (!name || !price || !category) {
      return errorResponse('Name, price, and category are required', 400);
    }

    const result = await db.prepare(
      'INSERT INTO products (name, price, category, image, description) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, parseInt(price), category, image || '', description || '').run();

    const newId = result.meta?.last_row_id;

    return jsonResponse({
      success: true,
      id: newId,
      message: 'Product created successfully'
    }, 201);
  } catch (e) {
    return errorResponse('Error creating product: ' + e.message, 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}
