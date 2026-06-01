/**
 * Categories API - /api/categories
 * GET: List all categories with product counts
 * POST: Create category (auth required)
 */
import { jsonResponse, errorResponse, handleOptions, validateAuth } from '../../lib.js';

export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const categories = await db.prepare(
      'SELECT slug, name, group_name, sort_order FROM categories ORDER BY group_name, sort_order'
    ).all();

    // Get product counts per category
    const counts = await db.prepare(
      'SELECT category, COUNT(*) as count FROM products GROUP BY category'
    ).all();

    const countMap = {};
    (counts.results || []).forEach(r => { countMap[r.category] = r.count; });

    // Group categories
    const groups = {};
    (categories.results || []).forEach(cat => {
      if (!groups[cat.group_name]) groups[cat.group_name] = [];
      groups[cat.group_name].push({
        slug: cat.slug,
        name: cat.name,
        group: cat.group_name,
        productCount: countMap[cat.slug] || 0,
        sortOrder: cat.sort_order
      });
    });

    return jsonResponse({
      categories: categories.results || [],
      groups,
      counts: countMap
    });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
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
    const { slug, name, group_name } = body;

    if (!slug || !name) return errorResponse('Slug and name are required', 400);

    const group = group_name || 'Productos';
    const maxSort = await db.prepare('SELECT MAX(sort_order) as max_sort FROM categories WHERE group_name = ?').bind(group).first();
    const sortOrder = (maxSort?.max_sort || 0) + 1;

    await db.prepare('INSERT INTO categories (slug, name, group_name, sort_order) VALUES (?, ?, ?, ?)')
      .bind(slug, name, group, sortOrder).run();

    return jsonResponse({ success: true, message: 'Category created' }, 201);
  } catch (e) {
    return errorResponse('Error creating category: ' + e.message, 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}
