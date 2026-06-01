/**
 * Auth API - /api/auth
 * Handles login, setup, password change, session management
 */
import { jsonResponse, errorResponse, handleOptions, validateAuth, hashPassword, verifyPassword, generateToken, ensureTables, seedData } from '../lib.js';

// Login: creates a session token
async function login(request, db) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) return errorResponse('Password required', 400);

    // Get stored password hash
    const setting = await db.prepare("SELECT value FROM admin_settings WHERE key = 'admin_password'").first();
    if (!setting) return errorResponse('Admin not configured. Run setup first.', 403);

    const valid = await verifyPassword(password, setting.value);
    if (!valid) return errorResponse('Invalid password', 401);

    // Create session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await db.prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)').bind(token, expiresAt).run();

    // Clean old expired sessions
    await db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();

    return jsonResponse({ success: true, token });
  } catch (e) {
    return errorResponse('Login error: ' + e.message, 500);
  }
}

// First-time setup: creates tables, seeds data, sets password
async function setup(request, db) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 4) {
      return errorResponse('Password must be at least 4 characters', 400);
    }

    // Check if already set up
    const existing = await db.prepare("SELECT value FROM admin_settings WHERE key = 'admin_password'").first();
    if (existing) {
      return errorResponse('Admin already configured. Use login instead.', 400);
    }

    // Create tables
    await ensureTables(db);

    // Seed data
    await seedData(db);

    // Set admin password
    const hash = await hashPassword(password);
    await db.prepare("INSERT INTO admin_settings (key, value) VALUES ('admin_password', ?)").bind(hash).run();

    // Auto-login after setup
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)').bind(token, expiresAt).run();

    return jsonResponse({ success: true, token, message: 'Setup complete! Database initialized with products.' });
  } catch (e) {
    return errorResponse('Setup error: ' + e.message, 500);
  }
}

// Check setup status (public)
async function status(db) {
  try {
    // Try to check if tables exist and if admin is configured
    const setting = await db.prepare("SELECT value FROM admin_settings WHERE key = 'admin_password'").first();
    const hasProducts = await db.prepare('SELECT COUNT(*) as cnt FROM products').first();

    return jsonResponse({
      configured: !!setting,
      hasProducts: hasProducts ? hasProducts.cnt > 0 : false,
      productCount: hasProducts ? hasProducts.cnt : 0
    });
  } catch (e) {
    // Tables don't exist yet
    return jsonResponse({ configured: false, hasProducts: false, productCount: 0 });
  }
}

// Change password (auth required)
async function changePassword(request, db) {
  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) return errorResponse('Both passwords required', 400);
    if (newPassword.length < 4) return errorResponse('New password must be at least 4 characters', 400);

    const setting = await db.prepare("SELECT value FROM admin_settings WHERE key = 'admin_password'").first();
    const valid = await verifyPassword(currentPassword, setting.value);
    if (!valid) return errorResponse('Current password is incorrect', 401);

    const hash = await hashPassword(newPassword);
    await db.prepare("UPDATE admin_settings SET value = ? WHERE key = 'admin_password'").bind(hash).run();

    return jsonResponse({ success: true, message: 'Password changed successfully' });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

// Logout: invalidate session
async function logout(request, db) {
  const auth = await validateAuth(request, db);
  if (auth.valid) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(auth.token).run();
  }
  return jsonResponse({ success: true });
}

// Export handler
export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return handleOptions();

  const { request, env } = context;
  const db = env.DB;

  if (!db) return errorResponse('Database not configured', 500);

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'login':
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await login(request, db);
      case 'setup':
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await setup(request, db);
      case 'status':
        return await status(db);
      case 'change-password':
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await changePassword(request, db);
      case 'logout':
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await logout(request, db);
      default:
        return errorResponse('Unknown auth action. Use: login, setup, status, change-password, logout', 400);
    }
  } catch (e) {
    return errorResponse('Server error: ' + e.message, 500);
  }
}
