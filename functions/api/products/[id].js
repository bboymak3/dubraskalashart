/**
 * Product Detail API - /api/products/:id
 * GET: Get single product
 * PUT: Update product (auth required)
 * DELETE: Delete product (auth required)
 */
import { jsonResponse, errorResponse, handleOptions, validateAuth } from '../../../lib.js';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid product ID', 400);

    const product = await db.prepare(
      'SELECT id, name, price, category, image, description as desc, sort_order FROM products WHERE id = ?'
    ).bind(id).first();

    if (!product) return errorResponse('Product not found', 404);

    return jsonResponse(product);
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid product ID', 400);

    const body = await request.json();
    const { name, price, category, image, description } = body;

    // Check product exists
    const existing = await db.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Product not found', 404);

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (price !== undefined) { updates.push('price = ?'); values.push(parseInt(price)); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (image !== undefined) { updates.push('image = ?'); values.push(image); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }

    if (updates.length === 0) return errorResponse('No fields to update', 400);

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    return jsonResponse({ success: true, message: 'Product updated' });
  } catch (e) {
    return errorResponse('Error updating product: ' + e.message, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid product ID', 400);

    const existing = await db.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Product not found', 404);

    await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();

    return jsonResponse({ success: true, message: 'Product deleted' });
  } catch (e) {
    return errorResponse('Error deleting product: ' + e.message, 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}
