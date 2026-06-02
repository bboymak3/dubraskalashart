/**
 * Dubraskalash.art - Shopping Cart System
 * Uses localStorage for persistence across pages
 * Products loaded from D1 API with localStorage fallback
 */

// Product cache for cart operations
let _productCache = [];

// Cart Manager
const Cart = {
  STORAGE_KEY: 'dubraska_cart',

  // Set product cache from external data
  setProductCache(products) {
    _productCache = products || [];
  },

  // Get product by ID from cache or API
  async getProductById(id) {
    // Check cache first
    let product = _productCache.find(p => p.id === id);
    if (product) return product;

    // Try localStorage cache
    try {
      const cached = localStorage.getItem('dubraska_products_cache');
      if (cached) {
        const all = JSON.parse(cached);
        product = all.find(p => p.id === id);
        if (product) {
          _productCache = all;
          return product;
        }
      }
    } catch(e) {}

    // Try API
    try {
      const resp = await fetch(`/api/products/${id}`);
      if (resp.ok) {
        product = await resp.json();
        return product;
      }
    } catch(e) {}

    return null;
  },

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
    // Find product in cache, localStorage, or API (async)
    let product = _productCache.find(p => p.id === productId);

    // Fallback: try localStorage cache
    if (!product) {
      try {
        const cached = localStorage.getItem('dubraska_products_cache');
        if (cached) {
          const all = JSON.parse(cached);
          product = all.find(p => p.id === productId);
          if (product) _productCache = all;
        }
      } catch(e) {}
    }

    // If still not found, try fetching from API and add when ready
    if (!product) {
      this._addItemAsync(productId, qty);
      return;
    }

    this._addItemNow(product, qty);
  },

  _addItemNow(product, qty) {
    const items = this.getItems();
    const existing = items.find(i => i.id === product.id);

    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        qty: qty
      });
    }

    this.saveItems(items);
    this.showToast(product.name);
  },

  async _addItemAsync(productId, qty) {
    const product = await this.getProductById(productId);
    if (!product) {
      console.warn('Cart.addItem: Product not found for id', productId);
      return;
    }
    // Update cache
    if (!_productCache.find(p => p.id === productId)) {
      _productCache.push(product);
    }
    this._addItemNow(product, qty);
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
    const count = this.getCount();
    // Navbar badges
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    });
    // Bottom bar cart badges
    const barBadges = document.querySelectorAll('.cart-badge-bar');
    barBadges.forEach(badge => {
      badge.textContent = count;
      if (count > 0) {
        badge.classList.add('visible');
      } else {
        badge.classList.remove('visible');
      }
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

    let msg = 'Hola Dubraskalash! Quiero realizar el siguiente pedido:%0A%0A';
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
