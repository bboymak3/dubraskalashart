/**
 * _worker.js - Cloudflare Pages Worker
 * Bundles all API routes from functions/api/ into a single self-contained worker.
 * - API routes are matched and dispatched below
 * - All other requests fall through to env.ASSETS.fetch() for static assets
 */

// ============================================================
// SHARED UTILITIES (extracted once from all function files)
// ============================================================

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
      "SELECT * FROM dk_sessions WHERE token = ? AND expires_at > datetime('now')"
    ).bind(token).first();
    if (!session) {
      return { valid: false, error: 'Session expired. Please login again.' };
    }
    return { valid: true, token };
  } catch (e) {
    return { valid: false, error: 'Auth error: ' + e.message };
  }
}

// ============================================================
// AUTH HELPERS (unique to auth.js)
// ============================================================

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_dubraska_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const computed = await hashPassword(password);
  return computed === hash;
}

function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function ensureTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS dk_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'adhesivos',
      image TEXT DEFAULT '',
      description TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS dk_categories (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      group_name TEXT DEFAULT 'Productos',
      sort_order INTEGER DEFAULT 0
    )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS dk_admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS dk_sessions (
      token TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    )`).run();

  // Lead capture tables
  await db.prepare(`CREATE TABLE IF NOT EXISTS dk_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      location TEXT DEFAULT '',
      event_date TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS dk_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();

  // Generic dk_registrations (non-event, permanent QR capture)
  await db.prepare(`CREATE TABLE IF NOT EXISTS dk_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      source TEXT DEFAULT 'qr',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
}

async function seedData(db) {
  const existing = await db.prepare('SELECT COUNT(*) as cnt FROM dk_products').first();
  if (existing && existing.cnt > 0) return false;

  const dk_categories = [
    ['adhesivos', 'Adhesivos', 'Productos', 1],
    ['liquidos', 'Líquidos & Prep', 'Productos', 2],
    ['herramientas', 'Herramientas', 'Productos', 3],
    ['lashes', 'Lashes Clásicas', 'Productos', 4],
    ['fibras', 'Fibras Tecnológicas', 'Productos', 5],
    ['volumen', 'Volumen 4W/5W/6W', 'Productos', 6],
    ['fibras-u', 'Fibras U (Prom)', 'Productos', 7],
    ['especiales', 'Especiales', 'Productos', 8],
    ['white-spike', 'White Spike', 'Productos', 9],
    ['fibras-color', 'Fibras Color', 'Productos', 10],
    ['cilios', 'Cílios', 'Productos', 11],
    ['servicios-pestañas', 'Servicios Pestañas', 'Servicios', 12],
    ['servicios-cejas', 'Cejas & PMU', 'Servicios', 13],
    ['cursos', 'Cursos', 'Formacion', 14]
  ];

  for (const [slug, name, group, sort] of dk_categories) {
    await db.prepare('INSERT OR IGNORE INTO dk_categories (slug, name, group_name, sort_order) VALUES (?, ?, ?, ?)')
      .bind(slug, name, group, sort).run();
  }

  const dk_products = [
    ['Adhesivo Transparente', 29990, 'adhesivos', '/api/images/dubraska%2Fultra-clear-glue-Lash-Design.webp', 'Adhesivo transparente profesional. Temperatura 22-27°C, Humedad 50-60%, Retención 30-45 días, Conservación 5-8°C, Secado 0.5 segundos.'],
    ['Adhesivo Negro (Alta Humedad)', 29990, 'adhesivos', '/api/images/dubraska%2Fpegamento-pestañas-ultra-clear-glue-profesional-secado-rapido.webp', 'Adhesivo negro para ambientes de alta humedad. Temp 22-27°C, Humedad 50-60%, Retención 30-45 días, Secado 0.5 seg.'],
    ['Adhesivo Negro (Baja Humedad)', 29990, 'adhesivos', '/api/images/dubraska%2Fadhesivo-pestañas-alta-retencion-pro-lashistas-insumos-premium.webp', 'Adhesivo negro bajo en vapores. Temp 22-27°C, Humedad 38-50%, Retención 30-60 días. Viscosidad extra ligera.'],
    ['Remover de Extensiones', 15000, 'adhesivos', '/api/images/dubraska%2Fultra-clear-glue-Lash-Design-dubraska-chile.webp', 'Formulado cuidadosamente para remover suavemente las extensiones de pestañas sin dañar las pestañas naturales. Frasco de 20 gr.'],
    ['Lash Shampoo', 10000, 'liquidos', '/api/images/dubraska%2Fultra-clear-glue-Lash-Design-chile-latam-latinoamerica-venta.webp', 'Fórmula única para cuidar y realzar la belleza de tus pestañas. Enriquecido con ingredientes que fortalecen y nutren. Fragancia exclusiva Dubraska Lash. Frasco 50 ml.'],
    ['Super Bonder', 15000, 'liquidos', '/api/images/dubraska%2Finsumos-pestañas-top-line-premium-chile-calidad-internacional.webp', 'Funciona como sellante maximizando la retención de las extensiones. Presentación frasco de 15 ml.'],
    ['Primer', 15000, 'liquidos', '/api/images/dubraska%2Fproductos-pestañas-alta-gama-insumos-lash-artistas-expertas.webp', 'Preparador de la pestaña natural antes de la aplicación de extensiones. Presentación frasco de 15 ml.'],
    ['Limpador de Pinza', 5000, 'liquidos', '/api/images/dubraska%2Finsumos-lashistas-santiago-chile-tienda-pestañas-distribuidor-oficial.webp', 'Elimina todos los residuos de adhesivos en las pinzas de manera eficaz y rápida.'],
    ['Sellante Mágico (Ojipijas)', 18000, 'herramientas', '/api/images/dubraska%2Fextensiones-pestañas-pelo-pelo-santiago-chile-mirada-perfecta.jpg', 'Sellante especial para crear ojipijas perfectas. Producto innovador para un acabado profesional.'],
    ['Pinza de Alineamiento 5x', 18000, 'herramientas', '/api/images/dubraska%2Fpestañas-efecto-natural-organico-longitud-curvatura-esencia-unica.webp', 'Pinzas diseñadas con precisión para facilitar la aplicación y mantenimiento de extensiones. Modelo 0001.'],
    ['Pinza de Precisión Pro', 15000, 'herramientas', '/api/images/dubraska%2Fextensiones-de-pestañas-naturales-efecto-organico-lashista.webp', 'Pinzas diseñadas con precisión para facilitar la aplicación y el mantenimiento de extensiones de pestañas.'],
    ['Easy Fan - Máquina de Abanicos', 70000, 'herramientas', '/api/images/dubraska%2Feasy-fan-maquina-abanicos.webp', 'Máquina que facilita el armado de abanicos de manera rápida y uniforme. Ideal para lashistas profesionales.'],
    ['Lashes 0.07 (18 líneas)', 15000, 'lashes', '/api/images/dubraska%2Fpestañas-pelo-a-pelo-tecnica-clasica-santiago-chile.webp', 'Caja de pestañas 0.07 con 18 líneas, 5-13 mm. Disponible en curvaturas: C-MIX, CC-MIX, D-MIX.'],
    ['Lashes 0.10 (18 líneas)', 15000, 'lashes', '/api/images/dubraska%2Fextensiones-de-pestañas-naturales-efecto-organico-lashista.webp', 'Caja de pestañas 0.10 con 18 líneas, 5-13 mm. Disponible en curvaturas: C-MIX, D-MIX, CC-MIX.'],
    ['Fibras Tecnológicas 0.05 (16 líneas)', 12500, 'fibras', '/api/images/dubraska%2Fvolumen-tecnologico-pestañas-fibras-inteligentes-elite-peso-pluma.webp', 'Fibras tecnológicas 7 a 14 mm / 16 líneas. Curvaturas: 0.05C-MIX, 0.05D-MIX, 0.05M-MIX, 0.05CC-MIX, 0.05DD-MIX.'],
    ['Fibras Tecnológicas 0.07 (6 líneas)', 8000, 'fibras', '/api/images/dubraska%2Fvolumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.webp', 'Fibras tecnológicas 7 a 8 mm / 6 líneas. Curvaturas: 0.07C-MIX, 0.07CC-MIX, 0.07D-MIX.'],
    ['Fibras Tecnológicas 0.07 (16 líneas)', 14000, 'fibras', '/api/images/dubraska%2Fvolumen-tecnologico-pestañas-fibras-inteligentes-elite-peso-pluma.webp', 'Fibras tecnológicas 7 a 14 mm / 16 líneas. Curvaturas: 0.07C-MIX, 0.07D-MIX, 0.07L-MIX, 0.07M-MIX, 0.07CC-MIX, 0.07DD-MIX.'],
    ['Fibras Tecnológicas 0.07 Cortas (6 líneas)', 8000, 'fibras', '/api/images/dubraska%2Fvolumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.webp', 'Fibras tecnológicas 7 a 8 mm / 6 líneas. Curvaturas: 0.07C-MIX, 0.07CC-MIX, 0.07D-MIX.'],
    ['4W Volumen (16 líneas)', 14000, 'volumen', '/api/images/dubraska%2Fvolumen-ruso-pestañas-abanicos-artesanales-handmade-efecto-glamuroso.webp', 'Pestañas 4W, 7 a 14 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, L-MIX, M-MIX, CC-MIX, DD-MIX.'],
    ['5W Volumen (16 líneas)', 15000, 'volumen', '/api/images/dubraska%2Fvolumen-ruso-pestañas-abanicos-artesanales-handmade-efecto-glamuroso.webp', 'Pestañas 5W, 7 a 14 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, L-MIX, M-MIX, CC-MIX, DD-MIX.'],
    ['6W Volumen (16 líneas)', 15000, 'volumen', '/api/images/dubraska%2Fvolumen-ruso-pestañas-abanicos-artesanales-handmade-efecto-glamuroso.webp', 'Pestañas 6W, 7 a 14 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, L-MIX, M-MIX, CC-MIX, DD-MIX.'],
    ['U-4W Fibras Tecnológicas', 15000, 'fibras-u', '/api/images/dubraska%2Fclosed-fans-pestañas-textura-compacta-elegante-acabado-sofisticado.webp', 'Fibras U-4W, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.'],
    ['U-3W Fibras Tecnológicas', 15000, 'fibras-u', '/api/images/dubraska%2Fclosed-fans-pestañas-textura-compacta-elegante-acabado-sofisticado.webp', 'Fibras U-3W, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.'],
    ['U-5W Fibras Tecnológicas', 15000, 'fibras-u', '/api/images/dubraska%2Fclosed-fans-pestañas-textura-compacta-elegante-acabado-sofisticado.webp', 'Fibras U-5W, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.'],
    ['U-YY Fibras Tecnológicas', 15000, 'fibras-u', '/api/images/dubraska%2Fclosed-fans-pestañas-textura-compacta-elegante-acabado-sofisticado.webp', 'Fibras U-YY, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.'],
    ['Spire Lashes', 15000, 'especiales', '/api/images/dubraska%2Fpestañas-efecto-rimel-negro-intenso-maquillaje-diario-definicion.webp', 'Spire Lashes, 8 a 13 mm / 10 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Efecto espiga profesional.'],
    ['Tech Eyeliner', 15000, 'especiales', '/api/images/dubraska%2Fpestañas-efecto-rimel-negro-intenso-maquillaje-diario-definicion.webp', 'Tech Eyeliner con direcciones en ambos sentidos para lograr un delineado perfecto. 7 a 13 mm / 16 líneas. Curvaturas: 0.07 B-MIX, C-MIX, M-MIX.'],
    ['3W White Spike Verde', 15000, 'white-spike', '/api/images/dubraska%2Fvolumen-americano-pestañas-estilo-spikes-texturizado-look-audaz.webp', '3W White Spike Tono Verde, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['3W White Spike Rojo', 15000, 'white-spike', '/api/images/dubraska%2Fvolumen-americano-pestañas-estilo-spikes-texturizado-look-audaz.webp', '3W White Spike Tono Rojo, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['3W White Spike Púrpura', 15000, 'white-spike', '/api/images/dubraska%2Fvolumen-americano-pestañas-estilo-spikes-texturizado-look-audaz.webp', '3W White Spike Tono Púrpura, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['Fibras Color Azul / Púrpura', 15000, 'fibras-color', '/api/images/dubraska%2Ffibras-colores-pestañas.webp', 'Fibras 7 a 13 mm / 16 líneas, Tono Azul / Púrpura. Curvaturas: 0.07 B-MIX, C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['Fibras Color Café / Marrón', 15000, 'fibras-color', '/api/images/dubraska%2Ffibras-colores-pestañas.webp', 'Fibras 7 a 13 mm / 16 líneas, Tono Café / Marrón. Curvaturas: 0.07 B-MIX, C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['Fibras Color Rosa', 15000, 'fibras-color', '/api/images/dubraska%2Ffibras-colores-pestañas.webp', 'Fibras 7 a 13 mm / 16 líneas, Tono Rosa. Curvaturas: 0.07 B-MIX, C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['Cílios 0.07 C MIX 5-15mm Mate', 18000, 'cilios', '/api/images/dubraska%2Fpestañas-pelo-a-pelo-tecnica-clasica-santiago-chile.webp', 'Cílios con tecnología láser, 0.07 C MIX, 5 a 15 mm mate. Disponibles en colores: Blanco, Verde, Rosa, Morado, Naranja, Café/Marrón, Amarillo, Rojo.'],
    ['Lash Couture Clásica 1x1', 45000, 'servicios-pestañas', '/api/images/dubraska%2Fextensiones-pestañas-pelo-pelo-santiago-chile-mirada-perfecta.webp', 'Eleva tu mirada con nuestra técnica exclusiva pelo a pelo. Aplicando una extensión premium sobre cada pestaña natural con precisión quirúrgica.'],
    ['Natural Essence Efecto Natural', 50000, 'servicios-pestañas', '/api/images/dubraska%2Fpestañas-efecto-natural-organico-longitud-curvatura-esencia-unica.webp', 'Diseño orgánico que aporta longitud y curvatura estratégica sin comprometer la salud de tu mirada.'],
    ['Mascara Look Pro Efecto Rímel', 55000, 'servicios-pestañas', '/api/images/dubraska%2Fpestañas-efecto-rimel-negro-intenso-maquillaje-diario-definicion.webp', 'Acabado de pestañas maquilladas mediante fibras de mayor grosor y un negro intenso mate que define el ojo al instante.'],
    ['Signature Closed Fans', 60000, 'servicios-pestañas', '/api/images/dubraska%2Fclosed-fans-pestañas-textura-compacta-elegante-acabado-sofisticado.webp', 'Técnica de abanicos cerrados. Crea una textura compacta, densa y sumamente elegante para un look sofisticado.'],
    ['Tecno-Lash 5G Volumen Tecnológico', 65000, 'servicios-pestañas', '/api/images/dubraska%2Fvolumen-tecnologico-pestañas-fibras-inteligentes-elite-peso-pluma.webp', 'Fibras tecnológicas de última generación para máxima densidad con peso pluma. Alta retención y rapidez de aplicación.'],
    ['American Star Volume', 70000, 'servicios-pestañas', '/api/images/dubraska%2Fvolumen-americano-pestañas-estilo-spikes-texturizado-look-audaz.webp', 'Diseño irregular y lleno de textura. Diferentes longitudes y curvaturas para un volumen con movimiento vibrante.'],
    ['Royal Russian Volume Handmade', 75000, 'servicios-pestañas', '/api/images/dubraska%2Fvolumen-ruso-pestañas-abanicos-artesanales-handmade-efecto-glamuroso.webp', 'Densidad máxima mediante abanicos artesanales hechos a mano. Efecto glamuroso, extra tupido y profundamente oscuro.'],
    ['Brow Architecture Perfilado', 35000, 'servicios-cejas', '/api/images/dubraska%2Fperfilado-cejas-visagismo-profesional-diseño-perfecto-simetria-facial.webp', 'Arte del visagismo profesional. Esculpimos el marco perfecto para tu mirada mediante diseño simétrico basado en la morfología de tu rostro.'],
    ['Luxury Lip Blush Micropigmentación', 120000, 'servicios-cejas', '/api/images/dubraska%2Fmicropigmentacion-labios-efecto-acuarela-lip-blush-color-duradero.webp', 'Transforma tus labios con un delicado efecto acuarela. Color, definición y simetría para realzar tu tono natural.'],
    ['Master Microblading Cejas', 95000, 'servicios-cejas', '/api/images/dubraska%2Fmicroblading-cejas-pelo-a-pelo-maquillaje-permanente.webp', 'Reconstrucción pelo a pelo de alta precisión. Trazos ultra finos que imitan el crecimiento natural del vello.'],
    ['Silk Face Finish Depilación', 25000, 'servicios-cejas', '/api/images/dubraska%2Fdepilacion-facial-piel-suave-estetica-rostro-acabado-luminoso.webp', 'Técnicas de depilación facial delicadas que eliminan el vello no deseado respetando la integridad de tu piel.'],
    ['Curso Inicial Lash Design', 250000, 'cursos', '/api/images/dubraska%2Fcurso-extensiones-pestañas-lashista-profesional-chile-capacitacion-elite.webp', 'Aprende desde cero la técnica de extensiones de pestañas. Incluye teoría, práctica con modelo, kit de inicio y certificado. Presencial en Concepción.'],
    ['Curso Avanzado Volumen Ruso', 350000, 'cursos', '/api/images/dubraska%2Fcurso-extensiones-pestañas-lashista-profesional-chile-capacitacion-elite.webp', 'Perfecciona tu técnica con el curso avanzado de Volumen Ruso Handmade. Entrenamiento intensivo, material didáctico y certificación internacional.'],
    ['Mentoría Estratégica Business', 450000, 'cursos', '/api/images/dubraska%2Fdiseño-cejas-maquillaje-permanente-micropigmentacion-pro-rostro-armonico.webp', 'Mentoría integral para hacer crecer tu negocio de belleza. Estrategia de precios, marketing, branding y escalabilidad.']
  ];

  for (let i = 0; i < dk_products.length; i++) {
    const [name, price, category, image, description] = dk_products[i];
    await db.prepare(
      'INSERT INTO dk_products (name, price, category, image, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(name, price, category, image, description, i + 1).run();
  }

  return true;
}

// ============================================================
// IMAGE HELPERS (unique to images/[key].js)
// ============================================================

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

// ============================================================
// ROUTE HANDLERS
// ============================================================

// --- /api/dk_products (GET, POST, OPTIONS) ---

async function productsGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || 'sort_order';
    const ids = url.searchParams.get('ids');

    // Get specific dk_products by IDs (for cart)
    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (idList.length === 0) return jsonResponse([]);

      const placeholders = idList.map(() => '?').join(',');
      const result = await db.prepare(
        `SELECT id, name, price, category, image, description as desc FROM dk_products WHERE id IN (${placeholders})`
      ).bind(...idList).all();

      return jsonResponse(result.results || []);
    }

    let query = 'SELECT id, name, price, category, image, description as desc FROM dk_products WHERE 1=1';
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
    return errorResponse('Error fetching dk_products: ' + e.message, 500);
  }
}

async function productsPost(context) {
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
      'INSERT INTO dk_products (name, price, category, image, description) VALUES (?, ?, ?, ?, ?)'
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

// --- /api/dk_products/:id (GET, PUT, DELETE) ---

async function productsIdGet(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid product ID', 400);

    const product = await db.prepare(
      'SELECT id, name, price, category, image, description as desc, sort_order FROM dk_products WHERE id = ?'
    ).bind(id).first();

    if (!product) return errorResponse('Product not found', 404);

    return jsonResponse(product);
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

async function productsIdPut(context) {
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
    const existing = await db.prepare('SELECT id FROM dk_products WHERE id = ?').bind(id).first();
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

    await db.prepare(`UPDATE dk_products SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    return jsonResponse({ success: true, message: 'Product updated' });
  } catch (e) {
    return errorResponse('Error updating product: ' + e.message, 500);
  }
}

async function productsIdDelete(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid product ID', 400);

    const existing = await db.prepare('SELECT id FROM dk_products WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Product not found', 404);

    await db.prepare('DELETE FROM dk_products WHERE id = ?').bind(id).run();

    return jsonResponse({ success: true, message: 'Product deleted' });
  } catch (e) {
    return errorResponse('Error deleting product: ' + e.message, 500);
  }
}

// --- /api/dk_categories (GET, POST, OPTIONS) ---

async function categoriesGet(context) {
  const { env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const dk_categories = await db.prepare(
      'SELECT slug, name, group_name, sort_order FROM dk_categories ORDER BY group_name, sort_order'
    ).all();

    // Get product counts per category
    const counts = await db.prepare(
      'SELECT category, COUNT(*) as count FROM dk_products GROUP BY category'
    ).all();

    const countMap = {};
    (counts.results || []).forEach(r => { countMap[r.category] = r.count; });

    // Group dk_categories
    const groups = {};
    (dk_categories.results || []).forEach(cat => {
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
      dk_categories: dk_categories.results || [],
      groups,
      counts: countMap
    });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

async function categoriesPost(context) {
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
    const maxSort = await db.prepare('SELECT MAX(sort_order) as max_sort FROM dk_categories WHERE group_name = ?').bind(group).first();
    const sortOrder = (maxSort?.max_sort || 0) + 1;

    await db.prepare('INSERT INTO dk_categories (slug, name, group_name, sort_order) VALUES (?, ?, ?, ?)')
      .bind(slug, name, group, sortOrder).run();

    return jsonResponse({ success: true, message: 'Category created' }, 201);
  } catch (e) {
    return errorResponse('Error creating category: ' + e.message, 500);
  }
}

// --- /api/dk_categories/:slug (GET, PUT, DELETE) ---

async function categoriesSlugGet(context) {
  const { env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const slug = params.slug;
    if (!slug) return errorResponse('Category slug required', 400);

    const category = await db.prepare(
      'SELECT slug, name, group_name, sort_order FROM dk_categories WHERE slug = ?'
    ).bind(slug).first();

    if (!category) return errorResponse('Category not found', 404);

    // Also get product count for this category
    const count = await db.prepare(
      'SELECT COUNT(*) as cnt FROM dk_products WHERE category = ?'
    ).bind(slug).first();

    return jsonResponse({
      ...category,
      productCount: count?.cnt || 0
    });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

async function categoriesSlugPut(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const slug = params.slug;
    const body = await request.json();
    const { name, group_name } = body;

    const existing = await db.prepare('SELECT slug FROM dk_categories WHERE slug = ?').bind(slug).first();
    if (!existing) return errorResponse('Category not found', 404);

    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (group_name) { updates.push('group_name = ?'); values.push(group_name); }

    if (updates.length === 0) return errorResponse('No fields to update', 400);

    values.push(slug);
    await db.prepare(`UPDATE dk_categories SET ${updates.join(', ')} WHERE slug = ?`).bind(...values).run();

    return jsonResponse({ success: true, message: 'Category updated' });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

async function categoriesSlugDelete(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const slug = params.slug;

    // Check if category has dk_products
    const count = await db.prepare('SELECT COUNT(*) as cnt FROM dk_products WHERE category = ?').bind(slug).first();
    if (count && count.cnt > 0) {
      return errorResponse(`Cannot delete: category has ${count.cnt} dk_products. Move them first.`, 400);
    }

    await db.prepare('DELETE FROM dk_categories WHERE slug = ?').bind(slug).run();

    return jsonResponse({ success: true, message: 'Category deleted' });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

// --- /api/images/:key (GET) ---

async function imagesKeyGet(context) {
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

// --- /api/upload (POST) ---

async function uploadPost(context) {
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

// --- /api/auth (POST, GET) ---

async function authLogin(request, db, authType) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) return errorResponse('Password required', 400);

    const keyName = authType === 'eventos' ? 'eventos_password' : 'admin_password';
    const setting = await db.prepare(`SELECT value FROM dk_admin_settings WHERE key = ?`).bind(keyName).first();
    if (!setting) return errorResponse('Not configured. Run setup first.', 403);

    const valid = await verifyPassword(password, setting.value);
    if (!valid) return errorResponse('Invalid password', 401);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.prepare('INSERT INTO dk_sessions (token, expires_at) VALUES (?, ?)').bind(token, expiresAt).run();

    // Clean old expired dk_sessions
    await db.prepare("DELETE FROM dk_sessions WHERE expires_at < datetime('now')").run();

    return jsonResponse({ success: true, token, type: authType || 'admin' });
  } catch (e) {
    return errorResponse('Login error: ' + e.message, 500);
  }
}

async function authSetup(request, db, authType) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 4) {
      return errorResponse('Password must be at least 4 characters', 400);
    }

    const keyName = authType === 'eventos' ? 'eventos_password' : 'admin_password';
    const existing = await db.prepare(`SELECT value FROM dk_admin_settings WHERE key = ?`).bind(keyName).first();
    if (existing) {
      return errorResponse('Already configured. Use login instead.', 400);
    }

    // Always ensure tables exist on any setup
    await ensureTables(db);

    // Only seed data on main admin setup
    if (authType !== 'eventos') {
      await seedData(db);
    }

    const hash = await hashPassword(password);
    await db.prepare(`INSERT INTO dk_admin_settings (key, value) VALUES (?, ?)`).bind(keyName, hash).run();

    // Auto-login after setup
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO dk_sessions (token, expires_at) VALUES (?, ?)').bind(token, expiresAt).run();

    const msg = authType === 'eventos'
      ? 'Setup complete! Panel de Eventos configurado.'
      : 'Setup complete! Database initialized with dk_products.';
    return jsonResponse({ success: true, token, type: authType || 'admin', message: msg });
  } catch (e) {
    return errorResponse('Setup error: ' + e.message, 500);
  }
}

async function authStatus(db, authType) {
  try {
    const keyName = authType === 'eventos' ? 'eventos_password' : 'admin_password';
    const setting = await db.prepare(`SELECT value FROM dk_admin_settings WHERE key = ?`).bind(keyName).first();

    if (authType === 'eventos') {
      const hasEvents = await db.prepare('SELECT COUNT(*) as cnt FROM dk_events').first();
      const hasRegistrations = await db.prepare('SELECT COUNT(*) as cnt FROM dk_registrations').first();
      return jsonResponse({
        configured: !!setting,
        hasEvents: hasEvents ? hasEvents.cnt > 0 : false,
        hasRegistrations: hasRegistrations ? hasRegistrations.cnt > 0 : false
      });
    }

    const hasProducts = await db.prepare('SELECT COUNT(*) as cnt FROM dk_products').first();
    return jsonResponse({
      configured: !!setting,
      hasProducts: hasProducts ? hasProducts.cnt > 0 : false,
      productCount: hasProducts ? hasProducts.cnt : 0
    });
  } catch (e) {
    return jsonResponse({ configured: false, hasProducts: false, productCount: 0 });
  }
}

async function authChangePassword(request, db, authType) {
  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) return errorResponse('Both passwords required', 400);
    if (newPassword.length < 4) return errorResponse('New password must be at least 4 characters', 400);

    const keyName = authType === 'eventos' ? 'eventos_password' : 'admin_password';
    const setting = await db.prepare(`SELECT value FROM dk_admin_settings WHERE key = ?`).bind(keyName).first();
    const valid = await verifyPassword(currentPassword, setting.value);
    if (!valid) return errorResponse('Current password is incorrect', 401);

    const hash = await hashPassword(newPassword);
    await db.prepare(`UPDATE dk_admin_settings SET value = ? WHERE key = ?`).bind(hash, keyName).run();

    return jsonResponse({ success: true, message: 'Password changed successfully' });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

async function authLogout(request, db) {
  const auth = await validateAuth(request, db);
  if (auth.valid) {
    await db.prepare('DELETE FROM dk_sessions WHERE token = ?').bind(auth.token).run();
  }
  return jsonResponse({ success: true });
}

async function authHandler(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return errorResponse('Database not configured', 500);

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const authType = url.searchParams.get('type') || 'admin';

    switch (action) {
      case 'login':
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await authLogin(request, db, authType);
      case 'setup':
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await authSetup(request, db, authType);
      case 'status':
        return await authStatus(db, authType);
      case 'change-password':
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await authChangePassword(request, db, authType);
      case 'logout':
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await authLogout(request, db);
      default:
        return errorResponse('Unknown auth action. Use: login, setup, status, change-password, logout', 400);
    }
  } catch (e) {
    return errorResponse('Server error: ' + e.message, 500);
  }
}

// --- /api/r2-images (GET) ---

async function r2ImagesGet(context) {
  const { env } = context;
  const bucket = env.BUCKET;

  if (!bucket) return jsonResponse({ error: 'R2 storage not configured' }, 500);

  try {
    const prefix = 'dubraska/';
    const listed = await bucket.list({ prefix, limit: 1000 });

    const images = listed.objects
      .filter(obj => obj.size > 0) // skip empty "folder" markers
      .filter(obj => {
        const filename = obj.key.replace(prefix, '');
        const ext = filename.split('.').pop()?.toLowerCase();
        return ext === 'webp' || ext === 'png' || ext === 'jpg' || ext === 'jpeg';
      })
      .map(obj => {
        const key = obj.key;
        const filename = key.replace(prefix, '');
        const url = `/api/images/${encodeURIComponent(key)}`;
        const ext = filename.split('.').pop()?.toLowerCase();
        return {
          key,
          filename,
          url,
          size: obj.size,
          uploaded: obj.uploaded || obj.lastModified,
          type: ext
        };
      })
      // Deduplicate: prefer WebP over PNG/JPG with same base name
      .filter((obj, idx, arr) => {
        if (obj.type === 'webp') return true;
        const baseName = obj.filename.replace(/\.[^.]+$/, '');
        const hasWebp = arr.some(other => other.type === 'webp' && other.filename.replace(/\.[^.]+$/, '') === baseName);
        return !hasWebp;
      });

    return jsonResponse({ images, total: images.length });
  } catch (e) {
    return jsonResponse({ error: 'Error listing images: ' + e.message }, 500);
  }
}

// --- /api/dk_events (GET, POST) ---

async function eventsGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('active') === 'true';

    let query = 'SELECT * FROM dk_events';
    if (activeOnly) query += ' WHERE active = 1';
    query += ' ORDER BY event_date DESC, id DESC';

    const result = await db.prepare(query).all();

    // Add lead count for each event
    const eventsWithCounts = [];
    for (const ev of (result.results || [])) {
      const leadCount = await db.prepare('SELECT COUNT(*) as cnt FROM dk_leads WHERE event_id = ?').bind(ev.id).first();
      eventsWithCounts.push({ ...ev, lead_count: leadCount?.cnt || 0 });
    }

    return jsonResponse(eventsWithCounts);
  } catch (e) {
    return errorResponse('Error fetching dk_events: ' + e.message, 500);
  }
}

async function eventsPost(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const body = await request.json();
    const { name, slug, description, location, event_date, active } = body;

    if (!name || !slug) return errorResponse('Name and slug are required', 400);

    // Generate slug from name if not provided properly
    const finalSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const result = await db.prepare(
      'INSERT INTO dk_events (slug, name, description, location, event_date, active) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(finalSlug, name, description || '', location || '', event_date || '', active !== undefined ? (active ? 1 : 0) : 1).run();

    const newId = result.meta?.last_row_id;

    return jsonResponse({ success: true, id: newId, slug: finalSlug, message: 'Event created' }, 201);
  } catch (e) {
    if (e.message?.includes('UNIQUE constraint')) {
      return errorResponse('Ese slug ya existe. Usa otro nombre.', 400);
    }
    return errorResponse('Error creating event: ' + e.message, 500);
  }
}

// --- /api/dk_events/:id (GET, PUT, DELETE) ---

async function eventsIdGet(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid event ID', 400);

    const event = await db.prepare('SELECT * FROM dk_events WHERE id = ?').bind(id).first();
    if (!event) return errorResponse('Event not found', 404);

    const leadCount = await db.prepare('SELECT COUNT(*) as cnt FROM dk_leads WHERE event_id = ?').bind(id).first();

    return jsonResponse({ ...event, lead_count: leadCount?.cnt || 0 });
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

async function eventsIdPut(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid event ID', 400);

    const body = await request.json();

    const existing = await db.prepare('SELECT id FROM dk_events WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Event not found', 404);

    const updates = [];
    const values = [];

    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
    if (body.slug !== undefined) { updates.push('slug = ?'); values.push(body.slug); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    if (body.location !== undefined) { updates.push('location = ?'); values.push(body.location); }
    if (body.event_date !== undefined) { updates.push('event_date = ?'); values.push(body.event_date); }
    if (body.active !== undefined) { updates.push('active = ?'); values.push(body.active ? 1 : 0); }

    if (updates.length === 0) return errorResponse('No fields to update', 400);

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db.prepare(`UPDATE dk_events SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    return jsonResponse({ success: true, message: 'Event updated' });
  } catch (e) {
    return errorResponse('Error updating event: ' + e.message, 500);
  }
}

async function eventsIdDelete(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid event ID', 400);

    const existing = await db.prepare('SELECT id FROM dk_events WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Event not found', 404);

    // Delete dk_leads for this event first
    await db.prepare('DELETE FROM dk_leads WHERE event_id = ?').bind(id).run();
    await db.prepare('DELETE FROM dk_events WHERE id = ?').bind(id).run();

    return jsonResponse({ success: true, message: 'Event and its dk_leads deleted' });
  } catch (e) {
    return errorResponse('Error deleting event: ' + e.message, 500);
  }
}

// --- /api/dk_events/slug/:slug (GET - public, for captacion form) ---

async function eventsSlugGet(context) {
  const { env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const slug = params.slug;
    if (!slug) return errorResponse('Event slug required', 400);

    const event = await db.prepare('SELECT * FROM dk_events WHERE slug = ? AND active = 1').bind(slug).first();
    if (!event) return errorResponse('Evento no encontrado o no activo', 404);

    return jsonResponse(event);
  } catch (e) {
    return errorResponse('Error: ' + e.message, 500);
  }
}

// --- /api/dk_leads (GET, POST) ---

async function leadsGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('event_id');

    let query = 'SELECT l.*, e.name as event_name FROM dk_leads l LEFT JOIN dk_events e ON l.event_id = e.id';
    const params = [];

    if (eventId) {
      query += ' WHERE l.event_id = ?';
      params.push(parseInt(eventId));
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await db.prepare(query).bind(...params).all();
    return jsonResponse(result.results || []);
  } catch (e) {
    return errorResponse('Error fetching dk_leads: ' + e.message, 500);
  }
}

async function leadsPost(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const body = await request.json();
    const { event_id, name, phone, email, notes } = body;

    if (!event_id || !name) {
      return errorResponse('Evento y nombre son obligatorios', 400);
    }

    // Verify event exists and is active
    const event = await db.prepare('SELECT id, active FROM dk_events WHERE id = ?').bind(parseInt(event_id)).first();
    if (!event) return errorResponse('Evento no encontrado', 404);
    if (!event.active) return errorResponse('Este evento ya no está activo', 400);

    // Check for duplicate (same event + phone or email)
    if (phone || email) {
      const dupQuery = phone
        ? 'SELECT id FROM dk_leads WHERE event_id = ? AND phone = ?'
        : 'SELECT id FROM dk_leads WHERE event_id = ? AND email = ?';
      const dupVal = phone || email;
      const dup = await db.prepare(dupQuery).bind(parseInt(event_id), dupVal).first();
      if (dup) return errorResponse('Ya estás registrado en este evento', 400);
    }

    const result = await db.prepare(
      'INSERT INTO dk_leads (event_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?)'
    ).bind(parseInt(event_id), name.trim(), (phone || '').trim(), (email || '').trim().toLowerCase(), (notes || '').trim()).run();

    const newId = result.meta?.last_row_id;

    return jsonResponse({ success: true, id: newId, message: 'Registro exitoso' }, 201);
  } catch (e) {
    return errorResponse('Error registrando: ' + e.message, 500);
  }
}

// --- /api/dk_leads/:id (DELETE) ---

async function leadsIdDelete(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid lead ID', 400);

    await db.prepare('DELETE FROM dk_leads WHERE id = ?').bind(id).run();

    return jsonResponse({ success: true, message: 'Lead deleted' });
  } catch (e) {
    return errorResponse('Error deleting lead: ' + e.message, 500);
  }
}

// --- /api/dk_leads/export (GET - CSV export) ---

async function leadsExportGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('event_id');

    if (!eventId) return errorResponse('event_id is required', 400);

    const event = await db.prepare('SELECT name FROM dk_events WHERE id = ?').bind(parseInt(eventId)).first();
    if (!event) return errorResponse('Event not found', 404);

    const result = await db.prepare(
      'SELECT l.name, l.phone, l.email, l.notes, l.created_at FROM dk_leads l WHERE l.event_id = ? ORDER BY l.created_at DESC'
    ).bind(parseInt(eventId)).all();

    const dk_leads = result.results || [];

    // Build CSV
    const BOM = '\uFEFF';
    let csv = BOM + 'Nombre,Telefono,Email,Notas,Fecha Registro\n';
    for (const l of dk_leads) {
      const escape = (v) => `"${(v || '').replace(/"/g, '""')}"`;
      csv += `${escape(l.name)},${escape(l.phone)},${escape(l.email)},${escape(l.notes)},${escape(l.created_at)}\n`;
    }

    const eventName = event.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `leads_${eventName}_${new Date().toISOString().slice(0,10)}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (e) {
    return errorResponse('Error exporting: ' + e.message, 500);
  }
}

// --- /api/dk_registrations (GET, POST) ---

async function registrationsGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');

    let query = 'SELECT * FROM dk_registrations';
    const params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.prepare(query).bind(...params).all();
    return jsonResponse(result.results || []);
  } catch (e) {
    return errorResponse('Error fetching dk_registrations: ' + e.message, 500);
  }
}

async function registrationsPost(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  try {
    const body = await request.json();
    const { name, phone, email, source, notes } = body;

    if (!name) {
      return errorResponse('El nombre es obligatorio', 400);
    }

    // Check for duplicate (same phone or email)
    if (phone || email) {
      const dupQuery = phone
        ? 'SELECT id FROM dk_registrations WHERE phone = ?'
        : 'SELECT id FROM dk_registrations WHERE email = ?';
      const dupVal = phone || email;
      const dup = await db.prepare(dupQuery).bind(dupVal).first();
      if (dup) return errorResponse('Ya estás registrado/a', 400);
    }

    const result = await db.prepare(
      'INSERT INTO dk_registrations (name, phone, email, source, notes) VALUES (?, ?, ?, ?, ?)'
    ).bind(name.trim(), (phone || '').trim(), (email || '').trim().toLowerCase(), (source || 'qr').trim(), (notes || '').trim()).run();

    const newId = result.meta?.last_row_id;

    return jsonResponse({ success: true, id: newId, message: 'Registro exitoso' }, 201);
  } catch (e) {
    return errorResponse('Error registrando: ' + e.message, 500);
  }
}

// --- /api/dk_registrations/:id (DELETE) ---

async function registrationsIdDelete(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return errorResponse('Invalid registration ID', 400);

    await db.prepare('DELETE FROM dk_registrations WHERE id = ?').bind(id).run();

    return jsonResponse({ success: true, message: 'Registration deleted' });
  } catch (e) {
    return errorResponse('Error deleting registration: ' + e.message, 500);
  }
}

// --- /api/dk_registrations/export (GET - CSV export) ---

async function registrationsExportGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return errorResponse('Database not configured', 500);

  const auth = await validateAuth(request, db);
  if (!auth.valid) return errorResponse(auth.error, 401);

  try {
    const result = await db.prepare(
      'SELECT name, phone, email, source, notes, created_at FROM dk_registrations ORDER BY created_at DESC'
    ).all();

    const regs = result.results || [];

    // Build CSV
    const BOM = '\uFEFF';
    let csv = BOM + 'Nombre,Telefono,Email,Origen,Notas,Fecha Registro\n';
    for (const r of regs) {
      const escape = (v) => `"${(v || '').replace(/"/g, '""')}"`;
      csv += `${escape(r.name)},${escape(r.phone)},${escape(r.email)},${escape(r.source)},${escape(r.notes)},${escape(r.created_at)}\n`;
    }

    const filename = `registros_genericos_${new Date().toISOString().slice(0,10)}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (e) {
    return errorResponse('Error exporting: ' + e.message, 500);
  }
}

// ============================================================
// ROUTING
// ============================================================

/**
 * Route definitions.
 * Each route has: pattern, paramNames (for extraction), and method handlers.
 * More specific routes (with params) are listed BEFORE their base counterparts
 * so that path segments are checked correctly.
 */
const routes = [
  // Parameterized routes first (more specific)
  {
    pattern: /^\/api\/dk_events\/slug\/([^/]+)$/,
    paramNames: ['slug'],
    handlers: {
      GET: eventsSlugGet,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_registrations\/export$/,
    paramNames: [],
    handlers: {
      GET: registrationsExportGet,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_leads\/export$/,
    paramNames: [],
    handlers: {
      GET: leadsExportGet,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_events\/([^/]+)$/,
    paramNames: ['id'],
    handlers: {
      GET: eventsIdGet,
      PUT: eventsIdPut,
      DELETE: eventsIdDelete,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_registrations\/([^/]+)$/,
    paramNames: ['id'],
    handlers: {
      DELETE: registrationsIdDelete,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_leads\/([^/]+)$/,
    paramNames: ['id'],
    handlers: {
      DELETE: leadsIdDelete,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_products\/([^/]+)$/,
    paramNames: ['id'],
    handlers: {
      GET: productsIdGet,
      PUT: productsIdPut,
      DELETE: productsIdDelete,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_categories\/([^/]+)$/,
    paramNames: ['slug'],
    handlers: {
      GET: categoriesSlugGet,
      PUT: categoriesSlugPut,
      DELETE: categoriesSlugDelete,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    // Images key can contain encoded slashes; capture everything after /api/images/
    pattern: /^\/api\/images\/(.+)$/,
    paramNames: ['key'],
    handlers: {
      GET: imagesKeyGet,
      OPTIONS: () => handleOptions(),
    }
  },
  // Exact-match routes
  {
    pattern: /^\/api\/dk_registrations$/,
    paramNames: [],
    handlers: {
      GET: registrationsGet,
      POST: registrationsPost,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_events$/,
    paramNames: [],
    handlers: {
      GET: eventsGet,
      POST: eventsPost,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_leads$/,
    paramNames: [],
    handlers: {
      GET: leadsGet,
      POST: leadsPost,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_products$/,
    paramNames: [],
    handlers: {
      GET: productsGet,
      POST: productsPost,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/dk_categories$/,
    paramNames: [],
    handlers: {
      GET: categoriesGet,
      POST: categoriesPost,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/upload$/,
    paramNames: [],
    handlers: {
      POST: uploadPost,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/auth$/,
    paramNames: [],
    handlers: {
      GET: authHandler,
      POST: authHandler,
      OPTIONS: () => handleOptions(),
    }
  },
  {
    pattern: /^\/api\/r2-images$/,
    paramNames: [],
    handlers: {
      GET: r2ImagesGet,
      OPTIONS: () => handleOptions(),
    }
  },
];

/**
 * Match a URL pathname against the route table.
 * Returns { handler, params } or null if no route matches.
 */
function matchRoute(pathname, method) {
  for (const route of routes) {
    const match = route.pattern.exec(pathname);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });

      const handler = route.handlers[method];
      if (handler) {
        return { handler, params };
      }
      // Route matched but method not allowed
      return { handler: null, params, methodNotAllowed: true };
    }
  }
  return null;
}

// ============================================================
// MAIN WORKER EXPORT
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Only attempt API routing for /api/ paths
    if (pathname.startsWith('/api/')) {
      const match = matchRoute(pathname, method);

      if (match) {
        if (match.methodNotAllowed) {
          return errorResponse('Method not allowed', 405);
        }

        const context = {
          request,
          env,
          params: match.params,
        };

        return await match.handler(context);
      }

      // /api/ path but no matching route
      return errorResponse('Not found', 404);
    }

    // Non-API requests: serve static assets
    return env.ASSETS.fetch(request);
  }
};
