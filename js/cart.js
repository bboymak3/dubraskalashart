/**
 * Dubraskalash.art - Shopping Cart System
 * Uses localStorage for persistence across pages
 */

const PRODUCTS = [
  // PESTAÑAS
  { id: 1, name: 'Lash Couture Clásica 1x1', price: 45000, category: 'pestañas', image: 'images/pestañas-pelo-a-pelo-tecnica-clasica-santiago-chile.jpg', desc: 'Eleva tu mirada con nuestra técnica exclusiva de pestañas pelo a pelo. Aplicando una extensión premium sobre cada pestaña natural con precisión quirúrgica. Logramos un efecto de elegancia atemporal y definición perfecta.' },
  { id: 2, name: 'Natural Essence Efecto Natural', price: 50000, category: 'pestañas', image: 'images/extensiones-de-pestañas-naturales-efecto-organico-lashista.jpg', desc: 'Descubre la sutileza del diseño orgánico. Aporta longitud y curvatura estratégica sin comprometer la salud de tu mirada. La opción preferida en Chile para un look diario impecable.' },
  { id: 3, name: 'Mascara Look Pro Efecto Rímel', price: 55000, category: 'pestañas', image: 'images/pestañas-efecto-rimel-negro-intenso-mirada-perfecta.jpg', desc: 'Dile adiós al maquillaje diario. Logramos un acabado de pestañas maquilladas mediante fibras de mayor grosor y un negro intenso mate que define el ojo al instante.' },
  { id: 4, name: 'Signature Closed Fans', price: 60000, category: 'pestañas', image: 'images/pestañas-closed-fans-textura-compacta-volumen-elegante.jpg', desc: 'Experimenta la modernidad con nuestra técnica de abanicos cerrados. Crea una textura compacta, densa y sumamente elegante, ideal para un look sofisticado.' },
  { id: 5, name: 'Tecno-Lash 5G Volumen Tecnológico', price: 65000, category: 'pestañas', image: 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', desc: 'La revolución con fibras tecnológicas de última generación para máxima densidad con peso pluma. Líder en Chile por su alta retención y rapidez de aplicación.' },
  { id: 6, name: 'American Star Volume', price: 70000, category: 'pestañas', image: 'images/pestañas-volumen-americano-estilo-foxy-eyes-texturizado.jpg', desc: 'Diseño irregular y lleno de textura que rompe los esquemas. Combinamos diferentes longitudes y curvaturas para crear un volumen con movimiento vibrante.' },
  { id: 7, name: 'Royal Russian Volume Handmade', price: 75000, category: 'pestañas', image: 'images/pestañas-volumen-ruso-abanicos-artesanales-handmade-pro.jpg', desc: 'La joya de la corona. Densidad máxima mediante abanicos artesanales hechos a mano. Efecto glamuroso, extra tupido y profundamente oscuro.' },
  // CEJAS & PMU
  { id: 8, name: 'Brow Architecture Perfilado', price: 35000, category: 'cejas-pmu', image: 'images/perfilado-de-cejas-diseño-visagismo-profesional-chile.jpg', desc: 'El arte del visagismo profesional. Esculpimos el marco perfecto para tu mirada mediante un diseño simétrico basado en la morfología de tu rostro.' },
  { id: 9, name: 'Luxury Lip Blush Micropigmentación', price: 120000, category: 'cejas-pmu', image: 'images/micropigmentacion-de-labios-efecto-acuarela-lip-blush.jpg', desc: 'Transforma tus labios con un delicado efecto acuarela. Ofrece color, definición y simetría. Realza tu tono natural y corrige imperfecciones.' },
  { id: 10, name: 'Master Microblading Cejas', price: 95000, category: 'cejas-pmu', image: 'images/microblading-cejas-pelo-a-pelo-maquillaje-permanente.jpg', desc: 'Recupera la densidad de tus cejas. Reconstrucción pelo a pelo de alta precisión, creamos trazos ultra finos que imitan el crecimiento natural del vello.' },
  { id: 11, name: 'Silk Face Finish Depilación', price: 25000, category: 'cejas-pmu', image: 'images/depilacion-facial-piel-suave-perfeccion-rostro-estetica.jpg', desc: 'Logra una piel radiante con técnicas de depilación facial delicadas que eliminan el vello no deseado respetando la integridad de tu piel.' },
  // INSUMOS
  { id: 12, name: 'Adhesivo TopLine Ultra Retención', price: 18000, category: 'insumos', image: 'images/Pinzas-y-Herramientas.png', desc: 'Adhesivo profesional de ultra retención para extensiones de pestañas. Fórmula de secado rápido y máxima durabilidad. Ideal para lashistas profesionales.' },
  { id: 13, name: 'Pinza de Precisión Pro', price: 22000, category: 'insumos', image: 'images/Pinzas-y-Herramientas.png', desc: 'Pinza de precisión profesional para aplicación de extensiones. Acero inoxidable quirúrgico con punta ultra fina para un agarre perfecto.' },
  { id: 14, name: 'Set Fibras Tecnológicas 5G', price: 35000, category: 'insumos', image: 'images/volumen-tecnologico-pestañas-fibras-tecnologicas-alta-retencion.jpg', desc: 'Set completo de fibras tecnológicas de última generación. Incluye múltiples curvaturas y grosores para técnica de volumen tecnológico.' },
  // CURSOS
  { id: 15, name: 'Curso Inicial Lash Design', price: 250000, category: 'cursos', image: 'images/Rectangle.png', desc: 'Aprende desde cero la técnica de extensiones de pestañas. Incluye teoría, práctica con modelo, kit de inicio y certificado. Presencial en Concepción.' },
  { id: 16, name: 'Curso Avanzado Volumen Ruso', price: 350000, category: 'cursos', image: 'images/Rectangle.png', desc: 'Perfecciona tu técnica con el curso avanzado de Volumen Ruso Handmade. Incluye entrenamiento intensivo, material didáctico y certificación internacional.' },
  { id: 17, name: 'Mentoría Estratégica Business', price: 450000, category: 'cursos', image: 'images/Rectangle.png', desc: 'Mentoría integral para hacer crecer tu negocio de belleza. Estrategia de precios, marketing, branding y escalabilidad con acompañamiento personalizado.' }
];

const CATEGORIES = {
  'pestañas': 'Extensiones de Pestañas',
  'cejas-pmu': 'Cejas & PMU',
  'insumos': 'Insumos',
  'cursos': 'Cursos'
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
