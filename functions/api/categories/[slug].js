/**
 * Category Detail API - /api/categories/:slug
 * PUT: Update category (auth required)
 * DELETE: Delete category (auth required)
 */
import { jsonResponse, errorResponse, handleOptions, validateAuth } from '../../../_lib.js';

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
