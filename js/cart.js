/**
 * Dubraskalash.art - Shopping Cart System
 * Uses localStorage for persistence across pages
 */

const PRODUCTS = [
  // === ADHESIVOS ===
  { id: 1, name: 'Adhesivo Transparente', price: 29990, category: 'adhesivos', image: 'images/adhesivo-profesional-pestañas.jpg', desc: 'Adhesivo transparente profesional. Temperatura 22-27°C, Humedad 50-60%, Retención 30-45 días, Conservación 5-8°C, Secado 0.5 segundos.' },
  { id: 2, name: 'Adhesivo Negro (Alta Humedad)', price: 29990, category: 'adhesivos', image: 'images/adhesivo-profesional-pestañas.jpg', desc: 'Adhesivo negro para ambientes de alta humedad. Temp 22-27°C, Humedad 50-60%, Retención 30-45 días, Secado 0.5 seg.' },
  { id: 3, name: 'Adhesivo Negro (Baja Humedad)', price: 29990, category: 'adhesivos', image: 'images/adhesivo-profesional-pestañas.jpg', desc: 'Adhesivo negro bajo en vapores. Temp 22-27°C, Humedad 38-50%, Retención 30-60 días. Viscosidad extra ligera, 50% Butyl / 50% Cyanoacrylate.' },
  { id: 4, name: 'Remover de Extensiones', price: 15000, category: 'adhesivos', image: 'images/liquidos-preparacion-pestañas.jpg', desc: 'Formulado cuidadosamente para remover suavemente las extensiones de pestañas sin dañar las pestañas naturales. Frasco de 20 gr.' },

  // === LÍQUIDOS & PREPARACIÓN ===
  { id: 5, name: 'Lash Shampoo', price: 10000, category: 'liquidos', image: 'images/liquidos-preparacion-pestañas.jpg', desc: 'Fórmula única para cuidar y realzar la belleza de tus pestañas. Enriquecido con ingredientes que fortalecen y nutren, limpia suavemente y promueve pestañas más saludables. Fragancia exclusiva Dubraska Lash. Frasco 50 ml.' },
  { id: 6, name: 'Super Bonder', price: 15000, category: 'liquidos', image: 'images/liquidos-preparacion-pestañas.jpg', desc: 'Funciona como sellante maximizando la retención de las extensiones. Presentación frasco de 15 ml.' },
  { id: 7, name: 'Primer', price: 15000, category: 'liquidos', image: 'images/liquidos-preparacion-pestañas.jpg', desc: 'Preparador de la pestaña natural antes de la aplicación de extensiones. Presentación frasco de 15 ml.' },
  { id: 8, name: 'Limpador de Pinza', price: 5000, category: 'liquidos', image: 'images/liquidos-preparacion-pestañas.jpg', desc: 'Elimina todos los residuos de adhesivos en las pinzas de manera eficaz y rápida.' },

  // === HERRAMIENTAS ===
  { id: 9, name: 'Sellante Mágico (Ojipijas)', price: 18000, category: 'herramientas', image: 'images/pinzas-herramientas-profesional.jpg', desc: 'Sellante especial para crear ojipijas perfectas. Producto innovador para un acabado profesional.' },
  { id: 10, name: 'Pinza de Alineamiento 5x', price: 18000, category: 'herramientas', image: 'images/pinzas-herramientas-profesional.jpg', desc: 'Pinzas diseñadas con precisión para facilitar la aplicación y mantenimiento de extensiones. Pinzas de alineamiento 5x modelo 0001.' },
  { id: 11, name: 'Pinza de Precisión Pro', price: 15000, category: 'herramientas', image: 'images/pinzas-herramientas-profesional.jpg', desc: 'Pinzas diseñadas con precisión para facilitar la aplicación y el mantenimiento de extensiones de pestañas. Clave para un trabajo detallado y preciso.' },
  { id: 12, name: 'Easy Fan - Máquina de Abanicos', price: 70000, category: 'herramientas', image: 'images/easy-fan-maquina-abanicos.jpg', desc: 'Máquina que facilita el armado de abanicos de manera rápida y uniforme. Ideal para lashistas profesionales que buscan eficiencia.' },

  // === LASHES CLÁSICAS ===
  { id: 13, name: 'Lashes 0.07 (18 líneas)', price: 15000, category: 'lashes', image: 'images/pestañas-pelo-a-pelo-tecnica-clasica-santiago-chile.jpg', desc: 'Caja de pestañas 0.07 con 18 líneas, 5-13 mm. Disponible en curvaturas: C-MIX, CC-MIX, D-MIX.' },
  { id: 14, name: 'Lashes 0.10 (18 líneas)', price: 15000, category: 'lashes', image: 'images/extensiones-de-pestañas-naturales-efecto-organico-lashista.jpg', desc: 'Caja de pestañas 0.10 con 18 líneas, 5-13 mm. Disponible en curvaturas: C-MIX, D-MIX, CC-MIX.' },

  // === FIBRAS TECNOLÓGICAS ===
  { id: 15, name: 'Fibras Tecnológicas 0.05 (16 líneas)', price: 12500, category: 'fibras', image: 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', desc: 'Fibras tecnológicas 7 a 14 mm / 16 líneas. Curvaturas: 0.05C-MIX, 0.05D-MIX, 0.05M-MIX, 0.05CC-MIX, 0.05DD-MIX.' },
  { id: 16, name: 'Fibras Tecnológicas 0.07 (6 líneas)', price: 8000, category: 'fibras', image: 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', desc: 'Fibras tecnológicas 7 a 8 mm / 6 líneas. Curvaturas: 0.07C-MIX, 0.07CC-MIX, 0.07D-MIX.' },
  { id: 17, name: 'Fibras Tecnológicas 0.07 (16 líneas)', price: 14000, category: 'fibras', image: 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', desc: 'Fibras tecnológicas 7 a 14 mm / 16 líneas. Curvaturas: 0.07C-MIX, 0.07D-MIX, 0.07L-MIX, 0.07M-MIX, 0.07CC-MIX, 0.07DD-MIX.' },
  { id: 18, name: 'Fibras Tecnológicas 0.07 Cortas (6 líneas)', price: 8000, category: 'fibras', image: 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', desc: 'Fibras tecnológicas 7 a 8 mm / 6 líneas. Curvaturas: 0.07C-MIX, 0.07CC-MIX, 0.07D-MIX.' },

  // === VOLUMEN (4W, 5W, 6W) ===
  { id: 19, name: '4W Volumen (16 líneas)', price: 14000, category: 'volumen', image: 'images/pestañas-volumen-ruso-abanicos-artesanales-handmade-pro.jpg', desc: 'Pestañas 4W, 7 a 14 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, L-MIX, M-MIX, CC-MIX, DD-MIX.' },
  { id: 20, name: '5W Volumen (16 líneas)', price: 15000, category: 'volumen', image: 'images/pestañas-volumen-ruso-abanicos-artesanales-handmade-pro.jpg', desc: 'Pestañas 5W, 7 a 14 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, L-MIX, M-MIX, CC-MIX, DD-MIX.' },
  { id: 21, name: '6W Volumen (16 líneas)', price: 15000, category: 'volumen', image: 'images/pestañas-volumen-ruso-abanicos-artesanales-handmade-pro.jpg', desc: 'Pestañas 6W, 7 a 14 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, L-MIX, M-MIX, CC-MIX, DD-MIX.' },

  // === FIBRAS U (PROM) ===
  { id: 22, name: 'U-4W Fibras Tecnológicas', price: 15000, category: 'fibras-u', image: 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', desc: 'Fibras U-4W, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.' },
  { id: 23, name: 'U-3W Fibras Tecnológicas', price: 15000, category: 'fibras-u', image: 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', desc: 'Fibras U-3W, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.' },
  { id: 24, name: 'U-5W Fibras Tecnológicas', price: 15000, category: 'fibras-u', image: 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', desc: 'Fibras U-5W, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.' },
  { id: 25, name: 'U-YY Fibras Tecnológicas', price: 15000, category: 'fibras-u', image: 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', desc: 'Fibras U-YY, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Próximamente curvatura M.' },

  // === ESPECIALES ===
  { id: 26, name: 'Spire Lashes', price: 15000, category: 'especiales', image: 'images/pestañas-efecto-rimel-negro-intenso-mirada-perfecta.jpg', desc: 'Spire Lashes, 8 a 13 mm / 10 líneas. Curvaturas: 0.07 C-MIX, D-MIX, CC-MIX. Efecto espiga profesional.' },
  { id: 27, name: 'Tech Eyeliner', price: 15000, category: 'especiales', image: 'images/pestañas-efecto-rimel-negro-intenso-mirada-perfecta.jpg', desc: 'Tech Eyeliner con direcciones en ambos sentidos para lograr un delineado perfecto. 7 a 13 mm / 16 líneas. Curvaturas: 0.07 B-MIX, C-MIX, M-MIX (Ideal para Foxy).' },

  // === WHITE SPIKE ===
  { id: 28, name: '3W White Spike Verde', price: 15000, category: 'white-spike', image: 'images/pestañas-volumen-americano-estilo-foxy-eyes-texturizado.jpg', desc: '3W White Spike Tono Verde, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, M-MIX, CC-MIX.' },
  { id: 29, name: '3W White Spike Rojo', price: 15000, category: 'white-spike', image: 'images/pestañas-volumen-americano-estilo-foxy-eyes-texturizado.jpg', desc: '3W White Spike Tono Rojo, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, M-MIX, CC-MIX.' },
  { id: 30, name: '3W White Spike Púrpura', price: 15000, category: 'white-spike', image: 'images/pestañas-volumen-americano-estilo-foxy-eyes-texturizado.jpg', desc: '3W White Spike Tono Púrpura, 7 a 13 mm / 16 líneas. Curvaturas: 0.07 C-MIX, D-MIX, M-MIX, CC-MIX.' },

  // === FIBRAS COLOR ===
  { id: 31, name: 'Fibras Color Azul / Púrpura', price: 15000, category: 'fibras-color', image: 'images/fibras-colores-pestañas.jpg', desc: 'Fibras 7 a 13 mm / 16 líneas, Tono Azul / Púrpura. Curvaturas: 0.07 B-MIX, C-MIX, D-MIX, M-MIX, CC-MIX.' },
  { id: 32, name: 'Fibras Color Café / Marrón', price: 15000, category: 'fibras-color', image: 'images/fibras-colores-pestañas.jpg', desc: 'Fibras 7 a 13 mm / 16 líneas, Tono Café / Marrón. Curvaturas: 0.07 B-MIX, C-MIX, D-MIX, M-MIX, CC-MIX.' },
  { id: 33, name: 'Fibras Color Rosa', price: 15000, category: 'fibras-color', image: 'images/fibras-colores-pestañas.jpg', desc: 'Fibras 7 a 13 mm / 16 líneas, Tono Rosa. Curvaturas: 0.07 B-MIX, C-MIX, D-MIX, M-MIX, CC-MIX.' },

  // === CÍLIOS ===
  { id: 34, name: 'Cílios 0.07 C MIX 5-15mm Mate', price: 18000, category: 'cilios', image: 'images/pestañas-pelo-a-pelo-tecnica-clasica-santiago-chile.jpg', desc: 'Cílios con tecnología láser, 0.07 C MIX, 5 a 15 mm mate. Disponibles en colores: Blanco, Verde, Rosa, Morado, Naranja, Café/Marrón, Amarillo, Rojo.' },

  // === SERVICIOS DE PESTAÑAS ===
  { id: 35, name: 'Lash Couture Clásica 1x1', price: 45000, category: 'servicios-pestañas', image: 'images/pestañas-pelo-a-pelo-tecnica-clasica-santiago-chile.jpg', desc: 'Eleva tu mirada con nuestra técnica exclusiva pelo a pelo. Aplicando una extensión premium sobre cada pestaña natural con precisión quirúrgica.' },
  { id: 36, name: 'Natural Essence Efecto Natural', price: 50000, category: 'servicios-pestañas', image: 'images/extensiones-de-pestañas-naturales-efecto-organico-lashista.jpg', desc: 'Diseño orgánico que aporta longitud y curvatura estratégica sin comprometer la salud de tu mirada.' },
  { id: 37, name: 'Mascara Look Pro Efecto Rímel', price: 55000, category: 'servicios-pestañas', image: 'images/pestañas-efecto-rimel-negro-intenso-mirada-perfecta.jpg', desc: 'Acabado de pestañas maquilladas mediante fibras de mayor grosor y un negro intenso mate que define el ojo al instante.' },
  { id: 38, name: 'Signature Closed Fans', price: 60000, category: 'servicios-pestañas', image: 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', desc: 'Técnica de abanicos cerrados. Crea una textura compacta, densa y sumamente elegante para un look sofisticado.' },
  { id: 39, name: 'Tecno-Lash 5G Volumen Tecnológico', price: 65000, category: 'servicios-pestañas', image: 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', desc: 'Fibras tecnológicas de última generación para máxima densidad con peso pluma. Alta retención y rapidez de aplicación.' },
  { id: 40, name: 'American Star Volume', price: 70000, category: 'servicios-pestañas', image: 'images/pestañas-volumen-americano-estilo-foxy-eyes-texturizado.jpg', desc: 'Diseño irregular y lleno de textura. Diferentes longitudes y curvaturas para un volumen con movimiento vibrante.' },
  { id: 41, name: 'Royal Russian Volume Handmade', price: 75000, category: 'servicios-pestañas', image: 'images/pestañas-volumen-ruso-abanicos-artesanales-handmade-pro.jpg', desc: 'Densidad máxima mediante abanicos artesanales hechos a mano. Efecto glamuroso, extra tupido y profundamente oscuro.' },

  // === SERVICIOS CEJAS & PMU ===
  { id: 42, name: 'Brow Architecture Perfilado', price: 35000, category: 'servicios-cejas', image: 'images/perfilado-de-cejas-diseño-visagismo-profesional-chile.jpg', desc: 'Arte del visagismo profesional. Esculpimos el marco perfecto para tu mirada mediante diseño simétrico basado en la morfología de tu rostro.' },
  { id: 43, name: 'Luxury Lip Blush Micropigmentación', price: 120000, category: 'servicios-cejas', image: 'images/micropigmentacion-de-labios-efecto-acuarela-lip-blush.jpg', desc: 'Transforma tus labios con un delicado efecto acuarela. Color, definición y simetría para realzar tu tono natural.' },
  { id: 44, name: 'Master Microblading Cejas', price: 95000, category: 'servicios-cejas', image: 'images/microblading-cejas-pelo-a-pelo-maquillaje-permanente.jpg', desc: 'Reconstrucción pelo a pelo de alta precisión. Trazos ultra finos que imitan el crecimiento natural del vello.' },
  { id: 45, name: 'Silk Face Finish Depilación', price: 25000, category: 'servicios-cejas', image: 'images/depilacion-facial-piel-suave-perfeccion-rostro-estetica.jpg', desc: 'Técnicas de depilación facial delicadas que eliminan el vello no deseado respetando la integridad de tu piel.' },

  // === CURSOS ===
  { id: 46, name: 'Curso Inicial Lash Design', price: 250000, category: 'cursos', image: 'images/Rectangle.png', desc: 'Aprende desde cero la técnica de extensiones de pestañas. Incluye teoría, práctica con modelo, kit de inicio y certificado. Presencial en Concepción.' },
  { id: 47, name: 'Curso Avanzado Volumen Ruso', price: 350000, category: 'cursos', image: 'images/Rectangle.png', desc: 'Perfecciona tu técnica con el curso avanzado de Volumen Ruso Handmade. Entrenamiento intensivo, material didáctico y certificación internacional.' },
  { id: 48, name: 'Mentoría Estratégica Business', price: 450000, category: 'cursos', image: 'images/Rectangle.png', desc: 'Mentoría integral para hacer crecer tu negocio de belleza. Estrategia de precios, marketing, branding y escalabilidad.' }
];

const CATEGORIES = {
  'adhesivos': 'Adhesivos',
  'liquidos': 'Líquidos & Prep',
  'herramientas': 'Herramientas',
  'lashes': 'Lashes Clásicas',
  'fibras': 'Fibras Tecnológicas',
  'volumen': 'Volumen 4W/5W/6W',
  'fibras-u': 'Fibras U (Prom)',
  'especiales': 'Especiales',
  'white-spike': 'White Spike',
  'fibras-color': 'Fibras Color',
  'cilios': 'Cílios',
  'servicios-pestañas': 'Servicios Pestañas',
  'servicios-cejas': 'Cejas & PMU',
  'cursos': 'Cursos'
};

const CATEGORY_GROUPS = {
  'Productos': ['adhesivos', 'liquidos', 'herramientas', 'lashes', 'fibras', 'volumen', 'fibras-u', 'especiales', 'white-spike', 'fibras-color', 'cilios'],
  'Servicios': ['servicios-pestañas', 'servicios-cejas'],
  'Formación': ['cursos']
};

// Cart Manager
const Cart = {
  STORAGE_KEY: 'dubraska_cart',

  getItems() {
    try {
      const items = localStorage.getItem(this.STORAGE_KEY);
      return items ? JSON.parse(items) : [];
    } catch (e) {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    this.updateBadge();
    this.renderSidebar();
  },

  addItem(productId, qty = 1) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const items = this.getItems();
    const existing = items.find(i => i.id === productId);

    if (existing) {
      existing.qty += qty;
    } else {
      items.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: qty });
    }

    this.saveItems(items);
    this.showToast(product.name);
  },

  removeItem(productId) {
    let items = this.getItems();
    items = items.filter(i => i.id !== productId);
    this.saveItems(items);
  },

  updateQty(productId, qty) {
    if (qty < 1) {
      this.removeItem(productId);
      return;
    }
    const items = this.getItems();
    const item = items.find(i => i.id === productId);
    if (item) {
      item.qty = qty;
      this.saveItems(items);
    }
  },

  getTotal() {
    return this.getItems().reduce((sum, item) => sum + (item.price * item.qty), 0);
  },

  getCount() {
    return this.getItems().reduce((sum, item) => sum + item.qty, 0);
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.updateBadge();
    this.renderSidebar();
  },

  formatPrice(price) {
    return '$' + price.toLocaleString('es-CL');
  },

  updateBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = this.getCount();
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    });
  },

  showToast(productName) {
    let toast = document.getElementById('cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cart-toast';
      toast.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;background:#25D366;color:#fff;padding:12px 24px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,0.2);font-family:Lato,sans-serif;font-size:0.9rem;transform:translateX(120%);transition:transform 0.3s ease;';
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<i class="ri-check-line me-2"></i>' + productName + ' agregado al carrito';
    toast.style.transform = 'translateX(0)';
    setTimeout(() => { toast.style.transform = 'translateX(120%)'; }, 2500);
  },

  renderSidebar() {
    const container = document.getElementById('cart-sidebar-items');
    const totalEl = document.getElementById('cart-sidebar-total');
    const emptyMsg = document.getElementById('cart-empty-msg');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    if (!container) return;

    const items = this.getItems();

    if (items.length === 0) {
      container.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (totalEl) totalEl.textContent = this.formatPrice(0);
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    if (checkoutBtn) checkoutBtn.style.display = 'block';

    container.innerHTML = items.map(item => `
      <div class="cart-sidebar-item d-flex gap-3 mb-3 pb-3 border-bottom">
        <img src="${item.image}" alt="${item.name}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
        <div class="flex-grow-1">
          <h6 class="mb-1" style="font-size:0.85rem;font-family:var(--font-heading);">${item.name}</h6>
          <div class="d-flex align-items-center gap-2 mb-1">
            <button class="btn btn-sm btn-outline-secondary px-2 py-0" onclick="Cart.updateQty(${item.id}, ${item.qty - 1})" style="font-size:0.8rem;">-</button>
            <span style="font-size:0.85rem;min-width:20px;text-align:center;">${item.qty}</span>
            <button class="btn btn-sm btn-outline-secondary px-2 py-0" onclick="Cart.updateQty(${item.id}, ${item.qty + 1})" style="font-size:0.8rem;">+</button>
          </div>
          <span style="color:var(--color-primary);font-weight:700;font-size:0.9rem;">${this.formatPrice(item.price * item.qty)}</span>
        </div>
        <button class="btn btn-sm p-0 text-muted" onclick="Cart.removeItem(${item.id})" title="Eliminar"><i class="ri-close-line fs-5"></i></button>
      </div>
    `).join('');

    if (totalEl) totalEl.textContent = this.formatPrice(this.getTotal());
  },

  checkout() {
    const items = this.getItems();
    if (items.length === 0) return;

    let msg = 'Hola Dubraskalash! 🛒 Quiero realizar el siguiente pedido:%0A%0A';
    items.forEach(item => {
      msg += `• ${item.name} x${item.qty} - ${this.formatPrice(item.price * item.qty)}%0A`;
    });
    msg += `%0ATotal: ${this.formatPrice(this.getTotal())}%0A%0AGracias!`;
    window.open(`https://wa.me/56946510308?text=${msg}`, '_blank');
  },

  toggleSidebar() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar) {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
      this.renderSidebar();
    }
  },

  closeSidebar() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  },

  init() {
    this.updateBadge();
    this.renderSidebar();
  }
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  Cart.init();
});
