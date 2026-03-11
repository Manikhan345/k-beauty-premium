/* ═══════════════════════════════════════════════════════════════
   K Beauty Premium — Shared JavaScript
   ═══════════════════════════════════════════════════════════════ */

// ── Site config ──
const SITE_PAGES = {
  home:       "index.html",
  skincare:   "category-skincare.html",
  serums:     "category-serums.html",
  facemasks:  "category-facemasks.html",
  sunscreen:  "category-sunscreen.html",
  makeup:     "category-makeup.html",
  lipcare:    "category-lipcare.html",
  haircare:   "category-haircare.html",
};

const FOOTER_PAGES = {
  about:      "about.html",
  contact:    "contact.html",
  privacy:    "privacy-policy.html",
  terms:      "terms-of-service.html",
  disclosure: "affiliate-disclosure.html",
};

const CATEGORY_META = {
  skincare:  { title: "🧴 Skincare",          file: "data/skincare.json" },
  serums:    { title: "💎 Serums & Essences",  file: "data/serums.json" },
  facemasks: { title: "🎭 Face Masks",         file: "data/facemasks.json" },
  sunscreen: { title: "☀️ Sunscreen / SPF",    file: "data/sunscreen.json" },
  makeup:    { title: "💄 Makeup",             file: "data/makeup.json" },
  lipcare:   { title: "👄 Lip Care",           file: "data/lipcare.json" },
  haircare:  { title: "💇 Hair Care",          file: "data/haircare.json" },
};

// ── Render a single product card HTML ──
function renderProductCard(product, btnText) {
  const btnLabel = btnText || "Buy Now";
  const badgeMap = { "Best Seller": "badge-hot", "New": "badge-new", "Deal": "badge-sale" };
  const badgeClass = badgeMap[product.badge] || "";
  const badgeHTML = product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>` : "";

  const hasImage = product.image && product.image.trim() !== "";
  const imgHTML = hasImage
    ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
    : `<div class="placeholder-icon">📦</div>`;

  const stars = product.rating >= 4.5 ? "★★★★★" : product.rating >= 4.0 ? "★★★★☆" : "★★★☆☆";

  let priceHTML = `$${product.price.toFixed(2)}`;
  if (product.originalPrice) {
    const discount = Math.round((1 - product.price / product.originalPrice) * 100);
    priceHTML += ` <span class="old-price">$${product.originalPrice.toFixed(2)}</span> <span class="discount">-${discount}%</span>`;
  }

  const primeHTML = product.prime ? `<div class="prime-tag">✓ Prime FREE Delivery</div>` : "";

  return `
    <div class="product-card" data-price="${product.price}" data-rating="${product.rating}" data-name="${product.name.toLowerCase()}">
      ${badgeHTML}
      <div class="product-img">${imgHTML}</div>
      <div class="product-name">${product.name}</div>
      <div class="product-rating"><span class="stars">${stars}</span><span class="rating-count">(${product.reviews})</span></div>
      <div class="product-price">${priceHTML}</div>
      ${primeHTML}
      <a href="${product.url || '#'}" class="buy-btn" target="_blank" rel="nofollow noopener">${btnLabel}</a>
    </div>
  `;
}

// ── Fetch product data from JSON ──
async function fetchProducts(jsonFile) {
  try {
    const response = await fetch(jsonFile);
    if (!response.ok) throw new Error(`Failed to load ${jsonFile}`);
    return await response.json();
  } catch (err) {
    console.error("Error loading products:", err);
    return [];
  }
}

// ── Wire up nav links ──
function wireLinks() {
  document.querySelectorAll("[data-page]").forEach(function(el) {
    var key = el.getAttribute("data-page");
    if (SITE_PAGES[key]) el.href = SITE_PAGES[key];
    else if (FOOTER_PAGES[key]) el.href = FOOTER_PAGES[key];
  });
}

// ── Back to top button ──
function initBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;
  window.addEventListener("scroll", function() {
    btn.classList.toggle("show", window.scrollY > 400);
  });
  btn.addEventListener("click", function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ── Init on DOM ready ──
document.addEventListener("DOMContentLoaded", function() {
  wireLinks();
  initBackToTop();
});
