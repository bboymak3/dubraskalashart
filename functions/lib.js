/**
 * Shared utilities for Cloudflare Pages Functions
 * D1 + R2 backend for Dubraskalash.art
 */

// ============================================
// RESPONSE HELPERS
// ============================================
export function jsonResponse(data, status = 200) {
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

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Handle CORS preflight
export function handleOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}

// ============================================
// AUTH
// ============================================
export async function validateAuth(request, db) {
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

// ============================================
// PASSWORD HASHING (simple but sufficient for admin panel)
// ============================================
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_dubraska_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, hash) {
  const computed = await hashPassword(password);
  return computed === hash;
}

// ============================================
// TOKEN GENERATION
// ============================================
export function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============================================
// DATABASE SETUP
// ============================================
export async function ensureTables(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'adhesivos',
      image TEXT DEFAULT '',
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      group_name TEXT DEFAULT 'Productos',
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );
  `);
}

// ============================================
// SEED DATA
// ============================================
export async function seedData(db) {
  // Check if already seeded
  const existing = await db.prepare('SELECT COUNT(*) as cnt FROM products').first();
  if (existing && existing.cnt > 0) return false;

  // Seed categories
  const categories = [
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

  for (const [slug, name, group, sort] of categories) {
    await db.prepare('INSERT OR IGNORE INTO categories (slug, name, group_name, sort_order) VALUES (?, ?, ?, ?)')
      .bind(slug, name, group, sort).run();
  }

  // Seed products
  const products = [
    ['Adhesivo Transparente', 29990, 'adhesivos', 'images/adhesivo-profesional-pestañas.jpg', 'Adhesivo transparente profesional. Temperatura 22-27°C, Humedad 50-60%, Retención 30-45 días, Conservación 5-8°C, Secado 0.5 segundos.'],
    ['Adhesivo Negro (Alta Humedad)', 29990, 'adhesivos', 'images/adhesivo-profesional-pestañas.jpg', 'Adhesivo negro para ambientes de alta humedad. Temp 22-27°C, Humedad 50-60%, Retención 30-45 días, Secado 0.5 seg.'],
    ['Adhesivo Negro (Baja Humedad)', 29990, 'adhesivos', 'images/adhesivo-profesional-pestañas.jpg', 'Adhesivo negro bajo en vapores. Temp 22-27°C, Humedad 38-50%, Retención 30-60 días. Viscosidad extra ligera.'],
    ['Remover de Extensiones', 15000, 'adhesivos', 'images/liquidos-preparacion-pestañas.jpg', 'Formulado cuidadosamente para remover suavemente las extensiones de pestañas sin dañar las pestañas naturales. Frasco de 20 gr.'],
    ['Lash Shampoo', 10000, 'liquidos', 'images/liquidos-preparacion-pestañas.jpg', 'Fórmula única para cuidar y realzar la belleza de tus pestañas. Enriquecido con ingredientes que fortalecen y nutren. Fragancia exclusiva Dubraska Lash. Frasco 50 ml.'],
    ['Super Bonder', 15000, 'liquidos', 'images/liquidos-preparacion-pestañas.jpg', 'Funciona como sellante maximizando la retención de las extensiones. Presentación frasco de 15 ml.'],
    ['Primer', 15000, 'liquidos', 'images/liquidos-preparacion-pestañas.jpg', 'Preparador de la pestaña natural antes de la aplicación de extensiones. Presentación frasco de 15 ml.'],
    ['Limpador de Pinza', 5000, 'liquidos', 'images/liquidos-preparacion-pestañas.jpg', 'Elimina todos los residuos de adhesivos en las pinzas de manera eficaz y rápida.'],
    ['Sellante Mágico (Ojipijas)', 18000, 'herramientas', 'images/pinzas-herramientas-profesional.jpg', 'Sellante especial para crear ojipijas perfectas. Producto innovador para un acabado profesional.'],
    ['Pinza de Alineamiento 5x', 18000, 'herramientas', 'images/pinzas-herramientas-profesional.jpg', 'Pinzas diseñadas con precisión para facilitar la aplicación y mantenimiento de extensiones. Modelo 0001.'],
    ['Pinza de Precisión Pro', 15000, 'herramientas', 'images/pinzas-herramientas-profesional.jpg', 'Pinzas diseñadas con precisión para facilitar la aplicación y el mantenimiento de extensiones de pestañas.'],
    ['Easy Fan - Máquina de Abanicos', 70000, 'herramientas', 'images/easy-fan-maquina-abanicos.jpg', 'Máquina que facilita el armado de abanicos de manera rápida y uniforme. Ideal para lashistas profesionales.'],
    ['Lashes 0.07 (18 líneas)', 15000, 'lashes', 'images/pestañas-pelo-a-pelo-tecnica-clasica-santiago-chile.jpg', 'Caja de pestañas 0.07 con 18 líneas, 5-13 mm. Disponible en curvaturas: C-MIX, CC-MIX, D-MIX.'],
    ['Lashes 0.10 (18 líneas)', 15000, 'lashes', 'images/extensiones-de-pestañas-naturales-efecto-organico-lashista.jpg', 'Caja de pestañas 0.10 con 18 líneas, 5-13 mm. Disponible en curvaturas: C-MIX, D-MIX, CC-MIX.'],
    ['Fibras Tecnológicas 0.05 (16 líneas)', 12500, 'fibras', 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', 'Fibras tecnológicas 7 a 14 mm / 16 líneas. Curvaturas: 0.05C-MIX, 0.05D-MIX, 0.05M-MIX, 0.05CC-MIX, 0.05DD-MIX.'],
    ['Fibras Tecnológicas 0.07 (6 líneas)', 8000, 'fibras', 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', 'Fibras tecnológicas 7 a 8 mm / 6 líneas. Curvaturas: 0.07C-MIX, 0.07CC-MIX, 0.07D-MIX.'],
    ['Fibras Tecnológicas 0.07 (16 líneas)', 14000, 'fibras', 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', 'Fibras tecnológicas 7 a 14 mm / 16 líneas. Curvaturas: 0.07C-MIX, 0.07D-MIX, 0.07L-MIX, 0.07M-MIX, 0.07CC-MIX, 0.07DD-MIX.'],
    ['Fibras Tecnológicas 0.07 Cortas (6 líneas)', 8000, 'fibras', 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', 'Fibras tecnológicas 7 a 8 mm / 6 líneas. Curvaturas: 0.07C-MIX, 0.07CC-MIX, 0.07D-MIX.'],
    ['4W Volumen (16 líneas)', 14000, 'volumen', 'images/pestañas-volumen-ruso-abanicos-artesanales-handmade-pro.jpg', 'Pestañas 4W, 7 a 14 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, L-MIX, M-MIX, CC-MIX, DD-MIX.'],
    ['5W Volumen (16 líneas)', 15000, 'volumen', 'images/pestañas-volumen-ruso-abanicos-artesanales-handmade-pro.jpg', 'Pestañas 5W, 7 a 14 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, L-MIX, M-MIX, CC-MIX, DD-MIX.'],
    ['6W Volumen (16 líneas)', 15000, 'volumen', 'images/pestañas-volumen-ruso-abanicos-artesanales-handmade-pro.jpg', 'Pestañas 6W, 7 a 14 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, L-MIX, M-MIX, CC-MIX, DD-MIX.'],
    ['U-4W Fibras Tecnológicas', 15000, 'fibras-u', 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', 'Fibras U-4W, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.'],
    ['U-3W Fibras Tecnológicas', 15000, 'fibras-u', 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', 'Fibras U-3W, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.'],
    ['U-5W Fibras Tecnológicas', 15000, 'fibras-u', 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', 'Fibras U-5W, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.'],
    ['U-YY Fibras Tecnológicas', 15000, 'fibras-u', 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', 'Fibras U-YY, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.'],
    ['Spire Lashes', 15000, 'especiales', 'images/pestañas-efecto-rimel-negro-intenso-mirada-perfecta.jpg', 'Spire Lashes, 8 a 13 mm / 10 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Efecto espiga profesional.'],
    ['Tech Eyeliner', 15000, 'especiales', 'images/pestañas-efecto-rimel-negro-intenso-mirada-perfecta.jpg', 'Tech Eyeliner con direcciones en ambos sentidos para lograr un delineado perfecto. 7 a 13 mm / 16 líneas. Curvaturas: 0.07 B-MIX, C-MIX, M-MIX.'],
    ['3W White Spike Verde', 15000, 'white-spike', 'images/pestañas-volumen-americano-estilo-foxy-eyes-texturizado.jpg', '3W White Spike Tono Verde, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['3W White Spike Rojo', 15000, 'white-spike', 'images/pestañas-volumen-americano-estilo-foxy-eyes-texturizado.jpg', '3W White Spike Tono Rojo, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['3W White Spike Púrpura', 15000, 'white-spike', 'images/pestañas-volumen-americano-estilo-foxy-eyes-texturizado.jpg', '3W White Spike Tono Púrpura, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['Fibras Color Azul / Púrpura', 15000, 'fibras-color', 'images/fibras-colores-pestañas.jpg', 'Fibras 7 a 13 mm / 16 líneas, Tono Azul / Púrpura. Curvaturas: 0.07 B-MIX, C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['Fibras Color Café / Marrón', 15000, 'fibras-color', 'images/fibras-colores-pestañas.jpg', 'Fibras 7 a 13 mm / 16 líneas, Tono Café / Marrón. Curvaturas: 0.07 B-MIX, C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['Fibras Color Rosa', 15000, 'fibras-color', 'images/fibras-colores-pestañas.jpg', 'Fibras 7 a 13 mm / 16 líneas, Tono Rosa. Curvaturas: 0.07 B-MIX, C-MIX, D-MIX, M-MIX, CC-MIX.'],
    ['Cílios 0.07 C MIX 5-15mm Mate', 18000, 'cilios', 'images/pestañas-pelo-a-pelo-tecnica-clasica-santiago-chile.jpg', 'Cílios con tecnología láser, 0.07 C MIX, 5 a 15 mm mate. Disponibles en colores: Blanco, Verde, Rosa, Morado, Naranja, Café/Marrón, Amarillo, Rojo.'],
    ['Lash Couture Clásica 1x1', 45000, 'servicios-pestañas', 'images/pestañas-pelo-a-pelo-tecnica-clasica-santiago-chile.jpg', 'Eleva tu mirada con nuestra técnica exclusiva pelo a pelo. Aplicando una extensión premium sobre cada pestaña natural con precisión quirúrgica.'],
    ['Natural Essence Efecto Natural', 50000, 'servicios-pestañas', 'images/extensiones-de-pestañas-naturales-efecto-organico-lashista.jpg', 'Diseño orgánico que aporta longitud y curvatura estratégica sin comprometer la salud de tu mirada.'],
    ['Mascara Look Pro Efecto Rímel', 55000, 'servicios-pestañas', 'images/pestañas-efecto-rimel-negro-intenso-mirada-perfecta.jpg', 'Acabado de pestañas maquilladas mediante fibras de mayor grosor y un negro intenso mate que define el ojo al instante.'],
    ['Signature Closed Fans', 60000, 'servicios-pestañas', 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', 'Técnica de abanicos cerrados. Crea una textura compacta, densa y sumamente elegante para un look sofisticado.'],
    ['Tecno-Lash 5G Volumen Tecnológico', 65000, 'servicios-pestañas', 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', 'Fibras tecnológicas de última generación para máxima densidad con peso pluma. Alta retención y rapidez de aplicación.'],
    ['American Star Volume', 70000, 'servicios-pestañas', 'images/pestañas-volumen-americano-estilo-foxy-eyes-texturizado.jpg', 'Diseño irregular y lleno de textura. Diferentes longitudes y curvaturas para un volumen con movimiento vibrante.'],
    ['Royal Russian Volume Handmade', 75000, 'servicios-pestañas', 'images/pestañas-volumen-ruso-abanicos-artesanales-handmade-pro.jpg', 'Densidad máxima mediante abanicos artesanales hechos a mano. Efecto glamuroso, extra tupido y profundamente oscuro.'],
    ['Brow Architecture Perfilado', 35000, 'servicios-cejas', 'images/perfilado-de-cejas-diseño-visagismo-profesional-chile.jpg', 'Arte del visagismo profesional. Esculpimos el marco perfecto para tu mirada mediante diseño simétrico basado en la morfología de tu rostro.'],
    ['Luxury Lip Blush Micropigmentación', 120000, 'servicios-cejas', 'images/micropigmentacion-de-labios-efecto-acuarela-lip-blush.jpg', 'Transforma tus labios con un delicado efecto acuarela. Color, definición y simetría para realzar tu tono natural.'],
    ['Master Microblading Cejas', 95000, 'servicios-cejas', 'images/microblading-cejas-pelo-a-pelo-maquillaje-permanente.jpg', 'Reconstrucción pelo a pelo de alta precisión. Trazos ultra finos que imitan el crecimiento natural del vello.'],
    ['Silk Face Finish Depilación', 25000, 'servicios-cejas', 'images/depilacion-facial-piel-suave-perfeccion-rostro-estetica.jpg', 'Técnicas de depilación facial delicadas que eliminan el vello no deseado respetando la integridad de tu piel.'],
    ['Curso Inicial Lash Design', 250000, 'cursos', 'images/Rectangle.png', 'Aprende desde cero la técnica de extensiones de pestañas. Incluye teoría, práctica con modelo, kit de inicio y certificado. Presencial en Concepción.'],
    ['Curso Avanzado Volumen Ruso', 350000, 'cursos', 'images/Rectangle.png', 'Perfecciona tu técnica con el curso avanzado de Volumen Ruso Handmade. Entrenamiento intensivo, material didáctico y certificación internacional.'],
    ['Mentoría Estratégica Business', 450000, 'cursos', 'images/Rectangle.png', 'Mentoría integral para hacer crecer tu negocio de belleza. Estrategia de precios, marketing, branding y escalabilidad.']
  ];

  for (let i = 0; i < products.length; i++) {
    const [name, price, category, image, description] = products[i];
    await db.prepare(
      'INSERT INTO products (name, price, category, image, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(name, price, category, image, description, i + 1).run();
  }

  return true;
}
