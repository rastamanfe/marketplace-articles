const cartKey = "marketplace-cart";

const state = {
  products: [],
  categories: [],
  cart: loadCart(),
  activeView: "catalog",
  adminConfig: { passwordRequired: false },
  adminPassword: sessionStorage.getItem("marketplace-admin-password") || "",
};

const ariary = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const money = {
  format(value) {
    return `${ariary.format(Number(value || 0))} Ar`;
  },
};

const els = {
  views: {
    catalog: document.querySelector("#catalogView"),
    admin: document.querySelector("#adminView"),
  },
  navButtons: document.querySelectorAll("[data-view]"),
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  minPriceFilter: document.querySelector("#minPriceFilter"),
  maxPriceFilter: document.querySelector("#maxPriceFilter"),
  clearFilters: document.querySelector("#clearFilters"),
  productsGrid: document.querySelector("#productsGrid"),
  productTotal: document.querySelector("#productTotal"),
  emptyProducts: document.querySelector("#emptyProducts"),
  cartCount: document.querySelector("#cartCount"),
  cartList: document.querySelector("#cartList"),
  cartTotal: document.querySelector("#cartTotal"),
  checkoutTotal: document.querySelector("#checkoutTotal"),
  clearCart: document.querySelector("#clearCart"),
  checkoutButton: document.querySelector("#checkoutButton"),
  productDialog: document.querySelector("#productDialog"),
  videoDialog: document.querySelector("#videoDialog"),
  checkoutDialog: document.querySelector("#checkoutDialog"),
  checkoutForm: document.querySelector("#checkoutForm"),
  adminProducts: document.querySelector("#adminProducts"),
  productForm: document.querySelector("#productForm"),
  categoryForm: document.querySelector("#categoryForm"),
  resetForm: document.querySelector("#resetForm"),
  resetCategoryForm: document.querySelector("#resetCategoryForm"),
  deleteCurrent: document.querySelector("#deleteCurrent"),
  deleteCategoryCurrent: document.querySelector("#deleteCategoryCurrent"),
  refreshAdmin: document.querySelector("#refreshAdmin"),
  refreshOrders: document.querySelector("#refreshOrders"),
  ordersTable: document.querySelector("#ordersTable"),
  adminCategories: document.querySelector("#adminCategories"),
  categoryOptions: document.querySelector("#categoryOptions"),
  productImagePreview: document.querySelector("#productImagePreview"),
  toast: document.querySelector("#toast"),
  stats: {
    products: document.querySelector("#statProducts"),
    categories: document.querySelector("#statCategories"),
    lowStock: document.querySelector("#statLowStock"),
    orders: document.querySelector("#statOrders"),
  },
};

const productFields = {
  id: document.querySelector("#productId"),
  name: document.querySelector("#productName"),
  sku: document.querySelector("#productSku"),
  brand: document.querySelector("#productBrand"),
  category: document.querySelector("#productCategory"),
  price: document.querySelector("#productPrice"),
  oldPrice: document.querySelector("#productOldPrice"),
  stock: document.querySelector("#productStock"),
  image: document.querySelector("#productImage"),
  imageFile: document.querySelector("#productImageFile"),
  video: document.querySelector("#productVideo"),
  videoFile: document.querySelector("#productVideoFile"),
  shortDescription: document.querySelector("#productShort"),
  description: document.querySelector("#productDescription"),
  specs: document.querySelector("#productSpecs"),
  tags: document.querySelector("#productTags"),
};

const maxLocalVideoBytes = 24 * 1024 * 1024;

const categoryFields = {
  id: document.querySelector("#categoryId"),
  name: document.querySelector("#categoryName"),
  description: document.querySelector("#categoryDescription"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadCart() {
  try {
    const saved = localStorage.getItem(cartKey);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(cartKey, JSON.stringify(state.cart));
}

async function request(path, options = {}) {
  const { admin = false, headers = {}, ...fetchOptions } = options;
  const requestHeaders = { "Content-Type": "application/json", ...headers };
  if (admin && state.adminPassword) {
    requestHeaders["x-admin-password"] = state.adminPassword;
  }

  const response = await fetch(path, {
    headers: requestHeaders,
    ...fetchOptions,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (admin && response.status === 401) {
      state.adminPassword = "";
      sessionStorage.removeItem("marketplace-admin-password");
    }
    throw new Error(data.error || "Erreur serveur");
  }
  return data;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function buildProductQuery() {
  const params = new URLSearchParams();
  const search = els.searchInput.value.trim();
  if (search) params.set("search", search);
  if (els.categoryFilter.value && els.categoryFilter.value !== "Toutes") {
    params.set("category", els.categoryFilter.value);
  }
  if (els.sortFilter.value) params.set("sort", els.sortFilter.value);
  if (els.minPriceFilter.value) params.set("minPrice", els.minPriceFilter.value);
  if (els.maxPriceFilter.value) params.set("maxPrice", els.maxPriceFilter.value);
  return params.toString();
}

async function loadCategories() {
  state.categories = await request("/api/categories");
  els.categoryFilter.innerHTML = [
    '<option value="Toutes">Toutes les categories</option>',
    ...state.categories.map(
      (category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)} (${category.products})</option>`,
    ),
  ].join("");
  els.categoryOptions.innerHTML = state.categories
    .map((category) => `<option value="${escapeHtml(category.name)}"></option>`)
    .join("");
  renderAdminCategories();
}

async function loadAdminConfig() {
  state.adminConfig = await request("/api/admin/config");
}

async function loadProducts() {
  const query = buildProductQuery();
  state.products = await request(`/api/products${query ? `?${query}` : ""}`);
  renderProducts();
  renderAdminProducts();
}

async function loadStats() {
  const stats = await request("/api/admin/stats", { admin: true });
  els.stats.products.textContent = stats.productCount;
  els.stats.categories.textContent = stats.categoryCount;
  els.stats.lowStock.textContent = stats.lowStock;
  els.stats.orders.textContent = stats.orderCount;
}

async function loadOrders() {
  const orders = await request("/api/orders", { admin: true });
  els.ordersTable.innerHTML =
    orders
      .map(
        (order) => `
          <tr>
            <td>${escapeHtml(order.order_number)}</td>
            <td>${escapeHtml(order.customer_name)}<br><small>${escapeHtml(order.customer_email)}</small></td>
            <td>${money.format(order.total)}</td>
            <td>${escapeHtml(order.status)}</td>
            <td>${escapeHtml(order.created_at)}</td>
            <td>
              <button class="danger-button" type="button" data-action="delete-order" data-id="${order.id}">
                Supprimer
              </button>
            </td>
          </tr>
        `,
      )
      .join("") || '<tr><td colspan="6">Aucune commande pour le moment.</td></tr>';
}

function renderProducts() {
  els.productTotal.textContent = state.products.length;
  els.emptyProducts.hidden = state.products.length !== 0;

  els.productsGrid.innerHTML = state.products
    .map((product) => {
      const oldPrice = product.oldPrice ? `<span class="old-price">${money.format(product.oldPrice)}</span>` : "";
      const stockText = product.stock > 0 ? `${product.stock} en stock` : "Rupture";
      const disabled = product.stock <= 0 ? "disabled" : "";
      const demoButton = renderDemoButton(product);
      return `
        <article class="product-card">
          <div class="product-media">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
            <span class="product-badge">${escapeHtml(product.category)}</span>
          </div>
          <div class="product-body">
            <span class="product-brand">${escapeHtml(product.brand)} - ${escapeHtml(product.sku)}</span>
            <h2 class="product-title">${escapeHtml(product.name)}</h2>
            <p class="product-desc">${escapeHtml(product.shortDescription)}</p>
            <div class="rating-line">Note ${Number(product.rating).toFixed(1)} / 5 - ${product.reviews} avis</div>
            <div class="price-row">
              <span class="price">${money.format(product.price)}</span>
              ${oldPrice}
            </div>
            <div class="stock-line">${stockText}</div>
            <div class="card-actions">
              <button class="secondary-button" type="button" data-action="details" data-id="${product.id}">Details</button>
              ${demoButton}
              <button class="primary-button" type="button" data-action="add-cart" data-id="${product.id}" ${disabled}>Ajouter</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCart() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  els.cartCount.textContent = totalItems;
  els.cartTotal.textContent = money.format(total);
  els.checkoutTotal.textContent = money.format(total);
  els.checkoutButton.disabled = state.cart.length === 0;

  els.cartList.innerHTML =
    state.cart
      .map(
        (item) => `
          <article class="cart-item">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <div class="product-brand">${escapeHtml(item.sku)}</div>
              <div class="price-row">
                <span>${money.format(item.price)}</span>
              </div>
              <div class="cart-tools">
                <button class="qty-button" type="button" data-action="cart-dec" data-id="${item.id}">-</button>
                <strong>${item.quantity}</strong>
                <button class="qty-button" type="button" data-action="cart-inc" data-id="${item.id}">+</button>
                <button class="link-button" type="button" data-action="cart-remove" data-id="${item.id}">Supprimer</button>
              </div>
            </div>
          </article>
        `,
      )
      .join("") || '<div class="empty-state"><strong>Panier vide</strong><p>Ajoute des articles depuis le catalogue.</p></div>';
}

function renderAdminProducts() {
  els.adminProducts.innerHTML =
    state.products
      .map(
        (product) => `
          <tr>
            <td>
              <strong>${escapeHtml(product.name)}</strong><br>
              <small>${escapeHtml(product.sku)} - ${escapeHtml(product.brand)}</small>
            </td>
            <td>${escapeHtml(product.category)}</td>
            <td>${money.format(product.price)}</td>
            <td>${product.stock}</td>
            <td>
              <div class="row-actions">
                <button class="secondary-button" type="button" data-action="edit-product" data-id="${product.id}">Modifier</button>
                <button class="danger-button" type="button" data-action="delete-product" data-id="${product.id}">Supprimer</button>
              </div>
            </td>
          </tr>
        `,
      )
      .join("") || '<tr><td colspan="5">Aucun article.</td></tr>';
}

function renderAdminCategories() {
  els.adminCategories.innerHTML =
    state.categories
      .map(
        (category) => `
          <tr>
            <td><strong>${escapeHtml(category.name)}</strong></td>
            <td>${escapeHtml(category.description || "")}</td>
            <td>${category.products}</td>
            <td>
              <div class="row-actions">
                <button class="secondary-button" type="button" data-action="edit-category" data-id="${category.id}">Modifier</button>
                <button class="danger-button" type="button" data-action="delete-category" data-id="${category.id}">Supprimer</button>
              </div>
            </td>
          </tr>
        `,
      )
      .join("") || '<tr><td colspan="4">Aucune categorie.</td></tr>';
}

function ensureAdminAccess() {
  if (!state.adminConfig.passwordRequired || state.adminPassword) return true;
  const password = prompt("Mot de passe administrateur");
  if (!password) return false;
  state.adminPassword = password;
  sessionStorage.setItem("marketplace-admin-password", password);
  return true;
}

async function switchView(view) {
  if (view === "cart") {
    document.querySelector(".cart-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (view === "admin") {
    if (!ensureAdminAccess()) return;
    try {
      await loadStats();
      await loadOrders();
    } catch (error) {
      showToast(error.message);
      return;
    }
  }

  state.activeView = view;
  Object.entries(els.views).forEach(([key, element]) => {
    element.classList.toggle("active", key === view);
  });
  els.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function findProduct(id) {
  return state.products.find((product) => product.id === Number(id));
}

async function getProduct(id) {
  const cached = findProduct(id);
  return cached || request(`/api/products/${id}`);
}

function productHasDemo(product) {
  return Boolean(String(product.videoUrl || "").trim());
}

function getYouTubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : "";
    }

    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return parsed.href;
      const videoId = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean)[1];
      return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : "";
    }
  } catch {
    return "";
  }

  return "";
}

function normalizeDemoVideoUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^data:video\//i.test(url)) return url;

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return getYouTubeEmbedUrl(parsed.href) || parsed.href;
  } catch {
    return "";
  }
}

function isDirectVideoUrl(url) {
  return /^data:video\//i.test(url) || /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
}

function renderDemoButton(product, extraClass = "") {
  if (!productHasDemo(product)) return "";
  const className = ["secondary-button", extraClass].filter(Boolean).join(" ");
  return `<button class="${className}" type="button" data-action="demo" data-id="${product.id}">Demo</button>`;
}

async function openProductDemo(id) {
  const product = await getProduct(id);
  const videoUrl = normalizeDemoVideoUrl(product.videoUrl);
  if (!videoUrl) {
    showToast("Aucune video demo valide pour cet article");
    return;
  }

  const player = isDirectVideoUrl(videoUrl)
    ? `<video class="demo-video" src="${escapeHtml(videoUrl)}" controls autoplay></video>`
    : `<iframe class="demo-video" src="${escapeHtml(videoUrl)}" title="Video demo ${escapeHtml(
        product.name,
      )}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;

  els.videoDialog.innerHTML = `
    <div class="video-box">
      <div class="section-title">
        <div>
          <p class="eyebrow">${escapeHtml(product.category)} - ${escapeHtml(product.sku)}</p>
          <h2>Demo ${escapeHtml(product.name)}</h2>
        </div>
        <form method="dialog"><button class="icon-button" type="submit">X</button></form>
      </div>
      ${player}
    </div>
  `;
  els.videoDialog.showModal();
}

async function openProductDetail(id) {
  const product = await getProduct(id);
  const specs = product.specs.map((spec) => `<li>${escapeHtml(spec)}</li>`).join("");
  const tags = product.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("");
  const oldPrice = product.oldPrice ? `<span class="old-price">${money.format(product.oldPrice)}</span>` : "";
  const demoButton = renderDemoButton(product, "full-button");

  els.productDialog.innerHTML = `
    <div class="product-detail">
      <img class="detail-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      <div class="detail-content">
        <div class="section-title">
          <div>
            <p class="eyebrow">${escapeHtml(product.category)} - ${escapeHtml(product.brand)}</p>
            <h2>${escapeHtml(product.name)}</h2>
          </div>
          <form method="dialog"><button class="icon-button" type="submit">X</button></form>
        </div>
        <div class="price-row">
          <span class="price">${money.format(product.price)}</span>
          ${oldPrice}
        </div>
        <p>${escapeHtml(product.description || product.shortDescription)}</p>
        <div class="rating-line">Reference ${escapeHtml(product.sku)} - Note ${Number(product.rating).toFixed(1)} / 5 - ${product.reviews} avis</div>
        <h3>Caracteristiques</h3>
        <ul class="spec-list">${specs || "<li>Aucune caracteristique</li>"}</ul>
        <h3>Tags</h3>
        <ul class="tag-list">${tags || "<li>Non defini</li>"}</ul>
        ${demoButton}
        <button class="primary-button full-button" type="button" data-action="add-cart" data-id="${product.id}" ${
          product.stock <= 0 ? "disabled" : ""
        }>Ajouter au panier</button>
      </div>
    </div>
  `;
  els.productDialog.showModal();
}

function addToCart(id) {
  const product = findProduct(id);
  if (!product) return;
  const existing = state.cart.find((item) => item.id === product.id);
  if (existing) {
    if (existing.quantity < product.stock) existing.quantity += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      image: product.image,
      stock: product.stock,
      quantity: 1,
    });
  }
  saveCart();
  renderCart();
  showToast("Article ajoute au panier");
}

function changeCartQuantity(id, delta) {
  const item = state.cart.find((candidate) => candidate.id === Number(id));
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter((candidate) => candidate.id !== Number(id));
  } else if (item.quantity > item.stock) {
    item.quantity = item.stock;
  }
  saveCart();
  renderCart();
}

function removeCartItem(id) {
  state.cart = state.cart.filter((item) => item.id !== Number(id));
  saveCart();
  renderCart();
}

function findCategory(id) {
  return state.categories.find((category) => category.id === Number(id));
}

function clearProductForm() {
  els.productForm.reset();
  productFields.id.value = "";
  document.querySelector("#formTitle").textContent = "Ajouter un article";
  els.deleteCurrent.disabled = true;
  updateImagePreview();
}

function clearCategoryForm() {
  els.categoryForm.reset();
  categoryFields.id.value = "";
  els.deleteCategoryCurrent.disabled = true;
}

function fillCategoryForm(category) {
  categoryFields.id.value = category.id;
  categoryFields.name.value = category.name;
  categoryFields.description.value = category.description || "";
  els.deleteCategoryCurrent.disabled = false;
  categoryFields.name.focus();
}

function collectCategoryForm() {
  return {
    name: categoryFields.name.value,
    description: categoryFields.description.value,
  };
}

function fillProductForm(product) {
  productFields.id.value = product.id;
  productFields.name.value = product.name;
  productFields.sku.value = product.sku;
  productFields.brand.value = product.brand;
  productFields.category.value = product.category;
  productFields.price.value = product.price;
  productFields.oldPrice.value = product.oldPrice || "";
  productFields.stock.value = product.stock;
  productFields.image.value = product.image;
  productFields.video.value = product.videoUrl || "";
  productFields.videoFile.value = "";
  productFields.shortDescription.value = product.shortDescription;
  productFields.description.value = product.description;
  productFields.specs.value = product.specs.join("\n");
  productFields.tags.value = product.tags.join(", ");
  document.querySelector("#formTitle").textContent = "Modifier un article";
  els.deleteCurrent.disabled = false;
  updateImagePreview();
  switchView("admin");
  productFields.name.focus();
}

function updateImagePreview() {
  const image = productFields.image.value.trim();
  els.productImagePreview.innerHTML = image
    ? `<img src="${escapeHtml(image)}" alt="Apercu image article"><span>Cette image sera utilisee dans le catalogue et la fiche detail.</span>`
    : "<span>Aucune image selectionnee</span>";
}

function readFileAsDataUrl(file, errorMessage) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(errorMessage));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image locale invalide"));
    image.src = src;
  });
}

async function compressLocalImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier choisi n'est pas une image");
  }

  const dataUrl = await readFileAsDataUrl(file, "Lecture de l'image impossible");
  const image = await loadImage(dataUrl);
  const maxSize = 1100;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.84);
}

async function importLocalVideo(file) {
  if (!file.type.startsWith("video/")) {
    throw new Error("Le fichier choisi n'est pas une video");
  }

  if (file.size > maxLocalVideoBytes) {
    throw new Error("Video trop volumineuse. Taille maximum: 24 Mo");
  }

  return readFileAsDataUrl(file, "Lecture de la video impossible");
}

function collectProductForm() {
  return {
    name: productFields.name.value,
    sku: productFields.sku.value,
    brand: productFields.brand.value,
    category: productFields.category.value,
    price: Number(productFields.price.value || 0),
    oldPrice: productFields.oldPrice.value ? Number(productFields.oldPrice.value) : null,
    stock: Number(productFields.stock.value || 0),
    image: productFields.image.value,
    videoUrl: productFields.video.value,
    shortDescription: productFields.shortDescription.value,
    description: productFields.description.value,
    specs: productFields.specs.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    tags: productFields.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

async function saveProduct(event) {
  event.preventDefault();
  if (!ensureAdminAccess()) return;
  const id = productFields.id.value;
  const payload = collectProductForm();
  try {
    if (id) {
      await request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload), admin: true });
      showToast("Article modifie");
    } else {
      await request("/api/products", { method: "POST", body: JSON.stringify(payload), admin: true });
      showToast("Article ajoute");
    }
    clearProductForm();
    await refreshAll({ admin: true });
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteProduct(id) {
  if (!ensureAdminAccess()) return;
  const product = findProduct(id);
  if (!product) return;
  const confirmed = confirm(`Supprimer l'article "${product.name}" ?`);
  if (!confirmed) return;
  try {
    await request(`/api/products/${id}`, { method: "DELETE", admin: true });
    state.cart = state.cart.filter((item) => item.id !== Number(id));
    saveCart();
    showToast("Article supprime");
    clearProductForm();
    await refreshAll({ admin: true });
  } catch (error) {
    showToast(error.message);
  }
}

async function saveCategory(event) {
  event.preventDefault();
  if (!ensureAdminAccess()) return;

  const id = categoryFields.id.value;
  const payload = collectCategoryForm();

  try {
    if (id) {
      await request(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(payload), admin: true });
      showToast("Categorie modifiee");
    } else {
      await request("/api/categories", { method: "POST", body: JSON.stringify(payload), admin: true });
      showToast("Categorie ajoutee");
    }
    clearCategoryForm();
    await refreshAll({ admin: true });
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteCategory(id) {
  if (!ensureAdminAccess()) return;

  const category = findCategory(id);
  if (!category) return;

  const replacement =
    category.products > 0 && category.name.toLowerCase() === "sans categorie" ? "Autres" : "Sans categorie";
  const message =
    category.products > 0
      ? `Supprimer "${category.name}" ? Ses ${category.products} article(s) seront deplaces vers "${replacement}".`
      : `Supprimer la categorie "${category.name}" ?`;

  if (!confirm(message)) return;

  const suffix = category.products > 0 ? `?reassign=${encodeURIComponent(replacement)}` : "";
  try {
    await request(`/api/categories/${id}${suffix}`, { method: "DELETE", admin: true });
    showToast("Categorie supprimee");
    clearCategoryForm();
    await refreshAll({ admin: true });
  } catch (error) {
    showToast(error.message);
  }
}

async function submitOrder(event) {
  event.preventDefault();
  const payload = {
    customer: {
      name: document.querySelector("#customerName").value,
      email: document.querySelector("#customerEmail").value,
      phone: document.querySelector("#customerPhone").value,
      address: document.querySelector("#customerAddress").value,
    },
    items: state.cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
  };
  const result = await request("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.cart = [];
  saveCart();
  renderCart();
  els.checkoutDialog.close();
  els.checkoutForm.reset();
  showToast(`Commande creee: ${result.orderNumber}`);
  await refreshAll();
}

async function deleteOrder(id) {
  if (!ensureAdminAccess()) return;
  const confirmed = confirm("Supprimer cette commande et remettre ses quantites en stock ?");
  if (!confirmed) return;

  try {
    const result = await request(`/api/orders/${id}`, { method: "DELETE", admin: true });
    showToast(`Commande supprimee. Stock restaure: ${result.restoredItems}`);
    await refreshAll({ admin: true });
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshAll(options = {}) {
  await loadCategories();
  await loadProducts();
  if (options.admin || !state.adminConfig.passwordRequired) {
    await loadStats();
    await loadOrders();
  }
  renderCart();
}

function bindEvents() {
  els.navButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  els.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadProducts();
  });

  [els.categoryFilter, els.sortFilter, els.minPriceFilter, els.maxPriceFilter].forEach((field) => {
    field.addEventListener("change", loadProducts);
  });

  els.clearFilters.addEventListener("click", async () => {
    els.searchInput.value = "";
    els.categoryFilter.value = "Toutes";
    els.sortFilter.value = "newest";
    els.minPriceFilter.value = "";
    els.maxPriceFilter.value = "";
    await loadProducts();
  });

  document.body.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;

    if (action === "details") await openProductDetail(id);
    if (action === "demo") await openProductDemo(id);
    if (action === "add-cart") addToCart(id);
    if (action === "cart-inc") changeCartQuantity(id, 1);
    if (action === "cart-dec") changeCartQuantity(id, -1);
    if (action === "cart-remove") removeCartItem(id);
    if (action === "edit-product") fillProductForm(await getProduct(id));
    if (action === "delete-product") await deleteProduct(id);
    if (action === "delete-order") await deleteOrder(id);
    if (action === "edit-category") {
      const category = findCategory(id);
      if (category) fillCategoryForm(category);
    }
    if (action === "delete-category") await deleteCategory(id);
  });

  els.clearCart.addEventListener("click", () => {
    state.cart = [];
    saveCart();
    renderCart();
  });

  els.checkoutButton.addEventListener("click", () => {
    if (state.cart.length === 0) return;
    els.checkoutDialog.showModal();
  });

  els.productForm.addEventListener("submit", saveProduct);
  els.categoryForm.addEventListener("submit", saveCategory);
  els.resetForm.addEventListener("click", clearProductForm);
  els.resetCategoryForm.addEventListener("click", clearCategoryForm);
  els.refreshAdmin.addEventListener("click", async () => {
    if (ensureAdminAccess()) await refreshAll({ admin: true });
  });
  els.refreshOrders.addEventListener("click", async () => {
    if (!ensureAdminAccess()) return;
    try {
      await loadOrders();
    } catch (error) {
      showToast(error.message);
    }
  });
  els.checkoutForm.addEventListener("submit", submitOrder);
  els.videoDialog.addEventListener("close", () => {
    els.videoDialog.innerHTML = "";
  });
  productFields.image.addEventListener("input", updateImagePreview);
  productFields.imageFile.addEventListener("change", async () => {
    const file = productFields.imageFile.files[0];
    if (!file) return;
    try {
      productFields.image.value = await compressLocalImage(file);
      updateImagePreview();
      showToast("Image locale ajoutee a l'article");
    } catch (error) {
      showToast(error.message);
      productFields.imageFile.value = "";
    }
  });
  productFields.videoFile.addEventListener("change", async () => {
    const file = productFields.videoFile.files[0];
    if (!file) return;
    try {
      productFields.video.value = await importLocalVideo(file);
      showToast("Video locale ajoutee a l'article");
    } catch (error) {
      showToast(error.message);
      productFields.videoFile.value = "";
    }
  });

  els.deleteCurrent.addEventListener("click", async () => {
    if (productFields.id.value) await deleteProduct(productFields.id.value);
  });
  els.deleteCategoryCurrent.addEventListener("click", async () => {
    if (categoryFields.id.value) await deleteCategory(categoryFields.id.value);
  });
}

async function init() {
  bindEvents();
  try {
    await loadAdminConfig();
    await refreshAll();
  } catch (error) {
    showToast(`Serveur indisponible: ${error.message}`);
    els.emptyProducts.hidden = false;
    els.emptyProducts.innerHTML =
      "<strong>Serveur non demarre</strong><p>Lance start_marketplace.cmd puis ouvre http://localhost:3000.</p>";
  }
}

init();
