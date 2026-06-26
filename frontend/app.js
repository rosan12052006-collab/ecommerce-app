const API_BASE = 'http://localhost:5000/api';

// ---------- State ----------
let state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  cart: JSON.parse(localStorage.getItem('cart') || '[]'), // [{productId, name, price, quantity}]
  wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]'), // [productId, ...]
  products: [],
};

const app = document.getElementById('app');

// ---------- API helper ----------
async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ---------- Persistence helpers ----------
function saveCart() { localStorage.setItem('cart', JSON.stringify(state.cart)); updateCartCount(); renderDrawer(); }
function saveWishlist() { localStorage.setItem('wishlist', JSON.stringify(state.wishlist)); updateWishlistCount(); }
function toggleWishlist(productId) {
  const idx = state.wishlist.indexOf(productId);
  if (idx === -1) state.wishlist.push(productId); else state.wishlist.splice(idx, 1);
  saveWishlist();
}
function updateWishlistCount() {
  const el = document.getElementById('wishlist-count');
  if (el) el.textContent = state.wishlist.length;
}

// ---- Dark mode ----
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
document.getElementById('theme-toggle').onclick = toggleTheme;
initTheme();

function login(user, token) {
  state.user = user; state.token = token;
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token);
  renderNav();
}
function logout() {
  state.user = null; state.token = null;
  localStorage.removeItem('user'); localStorage.removeItem('token');
  renderNav(); renderCatalog();
}

// ---------- Nav ----------
function renderNav() {
  document.getElementById('auth-status').textContent = state.user ? `${state.user.name} · ${state.user.role}` : '';
  document.getElementById('nav-auth').style.display = state.user ? 'none' : 'inline-block';
  document.getElementById('nav-logout').style.display = state.user ? 'inline-block' : 'none';
  document.getElementById('nav-admin').style.display = state.user && state.user.role === 'admin' ? 'inline-block' : 'none';
  updateCartCount();
}
function updateCartCount() {
  const count = state.cart.reduce((sum, i) => sum + i.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

document.getElementById('nav-catalog').onclick = renderCatalog;
document.getElementById('nav-wishlist').onclick = renderWishlist;
document.getElementById('nav-orders').onclick = renderMyOrders;
document.getElementById('nav-admin').onclick = renderAdmin;
document.getElementById('nav-auth').onclick = renderAuth;
document.getElementById('nav-logout').onclick = logout;

// ---------- Cart Drawer (signature element) ----------
const drawerEl = document.getElementById('cart-drawer');
document.getElementById('nav-cart').onclick = openDrawer;
document.getElementById('drawer-close').onclick = closeDrawer;
document.getElementById('drawer-overlay').onclick = closeDrawer;

function openDrawer() { drawerEl.classList.add('open'); renderDrawer(); }
function closeDrawer() { drawerEl.classList.remove('open'); }

function renderDrawer() {
  const content = document.getElementById('drawer-content');
  if (state.cart.length === 0) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">&#128722;</div><p>Your basket is empty.<br>Add something from the catalog.</p></div>`;
    return;
  }
  let total = 0;
  let rows = '';
  state.cart.forEach((item, idx) => {
    total += item.price * item.quantity;
    rows += `
      <div class="receipt-row">
        <span class="ri-name">${item.name}<br><span class="remove-link" data-action="remove" data-idx="${idx}">remove</span></span>
        <span class="ri-controls">
          <button class="qty-btn" data-action="dec" data-idx="${idx}">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-action="inc" data-idx="${idx}">+</button>
          <span style="width:54px; text-align:right;">$${(item.price * item.quantity).toFixed(2)}</span>
        </span>
      </div>`;
  });
  content.innerHTML = rows + `
    <div class="receipt-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    <button class="primary" id="drawer-checkout" style="margin-top:18px;">Proceed to checkout</button>
  `;

  content.querySelectorAll('[data-action="inc"]').forEach(btn => btn.onclick = () => { state.cart[btn.dataset.idx].quantity++; saveCart(); });
  content.querySelectorAll('[data-action="dec"]').forEach(btn => btn.onclick = () => { const i = state.cart[btn.dataset.idx]; i.quantity = Math.max(1, i.quantity - 1); saveCart(); });
  content.querySelectorAll('[data-action="remove"]').forEach(btn => btn.onclick = () => { state.cart.splice(btn.dataset.idx, 1); saveCart(); });
  const checkoutBtn = document.getElementById('drawer-checkout');
  if (checkoutBtn) checkoutBtn.onclick = () => { closeDrawer(); renderCheckoutForm(); };
}

function addToCart(product) {
  const existing = state.cart.find((i) => i.productId === product._id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ productId: product._id, name: product.name, price: product.price, quantity: 1 });
  saveCart();
  openDrawer();
}

// ---------- Catalog ----------
async function renderCatalog() {
  app.innerHTML = `
    <div class="hero">
      <p class="section-kicker">Fresh today</p>
      <h2>Goods worth crossing the street for.</h2>
      <p>Small-batch finds, restocked daily. Browse the shelves below.</p>
    </div>
    <p class="section-kicker">Catalog</p>
    <h2 class="section-title">All Products</h2>
    <div class="search-row"><input id="search" placeholder="Search products..." /></div>
    <div id="grid" class="grid">Loading...</div>`;

  document.getElementById('search').oninput = (e) => loadProducts(e.target.value);
  loadProducts();
}

async function loadProducts(search = '') {
  try {
    const products = await api(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    state.products = products;
    const grid = document.getElementById('grid');
    grid.innerHTML = products.length ? '' : '<p>No products found.</p>';
    products.forEach((p) => grid.appendChild(buildProductCard(p)));
  } catch (err) {
    document.getElementById('grid').innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function renderStars(rating) {
  const full = Math.round(rating || 0);
  let out = '';
  for (let i = 1; i <= 5; i++) out += i <= full ? '&#9733;' : '<span class="star-empty">&#9733;</span>';
  return out;
}

function buildProductCard(p) {
  const card = document.createElement('div');
  card.className = 'card';
  const lowStock = p.stock > 0 && p.stock <= 3;
  const hasDiscount = p.discountPercent > 0;
  const discounted = hasDiscount ? p.price * (1 - p.discountPercent / 100) : p.price;
  const isWishlisted = state.wishlist.includes(p._id);

  card.innerHTML = `
    ${hasDiscount ? `<span class="discount-badge">-${p.discountPercent}%</span>` : ''}
    <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" data-wish="${p._id}">${isWishlisted ? '&#9829;' : '&#9825;'}</button>
    <img src="${p.imageUrl || 'https://placehold.co/300x200?text=' + encodeURIComponent(p.name)}" />
    <div class="card-body">
      <h3>${p.name}</h3>
      <div class="rating-row"><span class="stars">${renderStars(p.rating)}</span><span class="rating-num">${(p.rating || 0).toFixed(1)}</span></div>
      <p class="card-desc">${p.description || ''}</p>
      <div class="meta-row">
        <span>${hasDiscount ? `<span class="price-strike">$${p.price.toFixed(2)}</span>` : ''}<span class="price">$${discounted.toFixed(2)}</span></span>
        <span class="stock-tag ${lowStock ? 'low' : ''}">${p.stock < 1 ? 'out of stock' : lowStock ? `only ${p.stock} left` : `${p.stock} in stock`}</span>
      </div>
      <button class="primary" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Out of stock' : 'Add to basket'}</button>
    </div>
  `;
  card.querySelector('button.primary').onclick = () => addToCart({ ...p, price: discounted });
  card.querySelector('[data-wish]').onclick = (e) => {
    toggleWishlist(p._id);
    e.target.closest('.wishlist-btn').classList.toggle('active');
    e.target.closest('.wishlist-btn').innerHTML = state.wishlist.includes(p._id) ? '&#9829;' : '&#9825;';
  };
  return card;
}

// ---------- Wishlist view ----------
async function renderWishlist() {
  app.innerHTML = `<p class="section-kicker">Saved for later</p><h2 class="section-title">Your Wishlist</h2><div id="grid" class="grid">Loading...</div>`;
  if (state.wishlist.length === 0) {
    document.getElementById('grid').innerHTML = `<div class="empty-state"><div class="empty-icon">&#9825;</div><p>Nothing saved yet — tap the heart on any product.</p></div>`;
    return;
  }
  try {
    const allProducts = await api('/products');
    const saved = allProducts.filter((p) => state.wishlist.includes(p._id));
    const grid = document.getElementById('grid');
    grid.innerHTML = saved.length ? '' : '<p>Saved items are no longer available.</p>';
    saved.forEach((p) => grid.appendChild(buildProductCard(p)));
  } catch (err) {
    document.getElementById('grid').innerHTML = `<p class="error">${err.message}</p>`;
  }
}

// ---------- Checkout ----------
function renderCheckoutForm() {
  if (!state.user) { alert('Please log in to checkout'); return renderAuth(); }
  if (state.cart.length === 0) { alert('Your basket is empty'); return renderCatalog(); }

  app.innerHTML = `
    <p class="section-kicker">Last step</p>
    <h2 class="section-title">Checkout</h2>
    <form id="checkout-form">
      <h3>Shipping details</h3>
      <label>Address</label><input name="address" required />
      <label>City</label><input name="city" required />
      <label>Postal Code</label><input name="postalCode" required />
      <label>Country</label><input name="country" required />
      <button type="submit" class="primary">Place order</button>
      <div id="checkout-msg"></div>
    </form>`;

  document.getElementById('checkout-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const shippingAddress = Object.fromEntries(fd.entries());
    const items = state.cart.map((i) => ({ productId: i.productId, quantity: i.quantity }));

    try {
      const order = await api('/orders', { method: 'POST', auth: true, body: { items, shippingAddress } });
      state.cart = [];
      saveCart();
      app.innerHTML = `
        <p class="section-kicker">Order confirmed</p>
        <h2 class="section-title">Thanks — it's on its way.</h2>
        <p class="order-id">Order ${order._id}</p>
        <p>Total: <strong>$${order.totalAmount.toFixed(2)}</strong></p>
        <button class="primary" style="max-width:200px; margin-top:16px;" onclick="renderCatalog()">Back to shop</button>`;
    } catch (err) {
      document.getElementById('checkout-msg').innerHTML = `<p class="error">${err.message}</p>`;
    }
  };
}

// ---------- My Orders ----------
async function renderMyOrders() {
  if (!state.user) { alert('Please log in to view orders'); return renderAuth(); }
  app.innerHTML = `<p class="section-kicker">Account</p><h2 class="section-title">My Orders</h2><div id="orders-list">Loading...</div>`;
  try {
    const orders = await api('/orders/my', { auth: true });
    const list = document.getElementById('orders-list');
    if (!orders.length) { list.innerHTML = '<p>No orders yet — your shelf is empty.</p>'; return; }
    list.innerHTML = orders.map((o) => `
      <div class="order-card">
        <p class="order-id">ORDER ${o._id}</p>
        <p><span class="status-pill status-${o.status}">${o.status}</span></p>
        <p><b>Total:</b> $${o.totalAmount.toFixed(2)}</p>
        <p><b>Items:</b> ${o.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}</p>
        <p><small>${new Date(o.createdAt).toLocaleString()}</small></p>
      </div>`).join('');
  } catch (err) {
    document.getElementById('orders-list').innerHTML = `<p class="error">${err.message}</p>`;
  }
}

// ---------- Auth ----------
function renderAuth() {
  app.innerHTML = `
    <p class="section-kicker">Welcome</p>
    <h2 class="section-title">Account</h2>
    <div style="display:flex; gap:24px; flex-wrap:wrap; margin-top:20px;">
      <form id="login-form">
        <h3>Log in</h3>
        <label>Email</label><input name="email" type="email" required />
        <label>Password</label><input name="password" type="password" required />
        <button type="submit" class="primary">Log in</button>
        <div id="login-msg"></div>
      </form>

      <form id="register-form">
        <h3>Register</h3>
        <label>Name</label><input name="name" required />
        <label>Email</label><input name="email" type="email" required />
        <label>Password</label><input name="password" type="password" minlength="6" required />
        <label>Role</label>
        <select name="role"><option value="user">User</option><option value="admin">Admin</option></select>
        <button type="submit" class="primary">Register</button>
        <div id="register-msg"></div>
      </form>
    </div>`;

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    try {
      const data = await api('/auth/login', { method: 'POST', body: fd });
      login({ _id: data._id, name: data.name, email: data.email, role: data.role }, data.token);
      renderCatalog();
    } catch (err) {
      document.getElementById('login-msg').innerHTML = `<p class="error">${err.message}</p>`;
    }
  };

  document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    try {
      const data = await api('/auth/register', { method: 'POST', body: fd });
      login({ _id: data._id, name: data.name, email: data.email, role: data.role }, data.token);
      renderCatalog();
    } catch (err) {
      document.getElementById('register-msg').innerHTML = `<p class="error">${err.message}</p>`;
    }
  };
}

// ---------- Admin ----------
async function renderAdmin() {
  if (!state.user || state.user.role !== 'admin') { alert('Admins only'); return renderCatalog(); }

  app.innerHTML = `
    <p class="section-kicker">Back office</p>
    <h2 class="section-title">Admin Dashboard</h2>
    <div id="dashboard" class="stat-grid">Loading stats...</div>
    <h3 style="margin-top:8px;">Revenue by status</h3>
    <div id="bar-chart" class="bar-chart" style="margin-bottom:32px;">Loading...</div>

    <form id="product-form">
      <h3>Add a product</h3>
      <label>Name</label><input name="name" required />
      <label>Description</label><textarea name="description"></textarea>
      <label>Price</label><input name="price" type="number" step="0.01" required />
      <label>Category</label><input name="category" />
      <label>Image URL</label><input name="imageUrl" />
      <label>Stock</label><input name="stock" type="number" required />
      <label>Rating (0-5)</label><input name="rating" type="number" step="0.1" min="0" max="5" value="4.5" />
      <label>Discount % (0-90)</label><input name="discountPercent" type="number" min="0" max="90" value="0" />
      <button type="submit" class="primary">Add product</button>
      <div id="product-msg"></div>
    </form>
    <h3 style="margin-top:32px;">Existing Products</h3>
    <div id="admin-products">Loading...</div>
    <h3 style="margin-top:32px;">All Orders</h3>
    <div id="admin-orders">Loading...</div>
  `;

  document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    fd.price = parseFloat(fd.price);
    fd.stock = parseInt(fd.stock, 10);
    fd.rating = parseFloat(fd.rating) || 4.5;
    fd.discountPercent = parseInt(fd.discountPercent, 10) || 0;
    try {
      await api('/products', { method: 'POST', auth: true, body: fd });
      e.target.reset();
      loadAdminProducts();
    } catch (err) {
      document.getElementById('product-msg').innerHTML = `<p class="error">${err.message}</p>`;
    }
  };

  loadDashboard();
  loadAdminProducts();
  loadAdminOrders();
}

async function loadDashboard() {
  const statBox = document.getElementById('dashboard');
  const chartBox = document.getElementById('bar-chart');
  try {
    const [orders, products] = await Promise.all([api('/orders', { auth: true }), api('/products')]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;
    const lowStockCount = products.filter((p) => p.stock <= 3).length;

    statBox.innerHTML = `
      <div class="stat-card"><p class="stat-label">Total Revenue</p><p class="stat-value accent">$${totalRevenue.toFixed(2)}</p></div>
      <div class="stat-card"><p class="stat-label">Total Orders</p><p class="stat-value">${totalOrders}</p></div>
      <div class="stat-card"><p class="stat-label">Avg Order Value</p><p class="stat-value">$${avgOrder.toFixed(2)}</p></div>
      <div class="stat-card"><p class="stat-label">Products Low on Stock</p><p class="stat-value accent">${lowStockCount}</p></div>
    `;

    const byStatus = {};
    orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + o.totalAmount; });
    const maxVal = Math.max(...Object.values(byStatus), 1);
    chartBox.innerHTML = Object.keys(byStatus).length
      ? Object.entries(byStatus).map(([status, amount]) => `
        <div class="bar-row">
          <span class="bar-label">${status}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(amount / maxVal) * 100}%"></div></div>
          <span class="bar-value">$${amount.toFixed(2)}</span>
        </div>`).join('')
      : '<p>No orders yet.</p>';
  } catch (err) {
    statBox.innerHTML = `<p class="error">${err.message}</p>`;
    chartBox.innerHTML = '';
  }
}

async function loadAdminProducts() {
  const container = document.getElementById('admin-products');
  try {
    const products = await api('/products');
    container.innerHTML = `<table><tr><th>Name</th><th>Price</th><th>Stock</th><th></th></tr>${products.map((p) => `
      <tr>
        <td>${p.name}</td><td>$${p.price.toFixed(2)}</td><td>${p.stock}</td>
        <td><button class="danger" data-id="${p._id}">Delete</button></td>
      </tr>`).join('')}</table>`;
    container.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.onclick = async () => {
        await api(`/products/${btn.dataset.id}`, { method: 'DELETE', auth: true });
        loadAdminProducts();
      };
    });
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

async function loadAdminOrders() {
  const container = document.getElementById('admin-orders');
  try {
    const orders = await api('/orders', { auth: true });
    container.innerHTML = `<table><tr><th>User</th><th>Total</th><th>Status</th><th>Update</th></tr>${orders.map((o) => `
      <tr>
        <td>${o.user ? o.user.name : 'N/A'}</td>
        <td>$${o.totalAmount.toFixed(2)}</td>
        <td><span class="status-pill status-${o.status}">${o.status}</span></td>
        <td>
          <select data-id="${o._id}">
            ${['pending','processing','shipped','delivered','cancelled'].map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('')}</table>`;
    container.querySelectorAll('select[data-id]').forEach((sel) => {
      sel.onchange = async () => {
        await api(`/orders/${sel.dataset.id}/status`, { method: 'PUT', auth: true, body: { status: sel.value } });
        loadAdminOrders();
      };
    });
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

// ---------- Init ----------
renderNav();
renderCatalog();
