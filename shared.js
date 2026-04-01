/* ═══════════════════════════════════════════════════════════════
   K Beauty Premium — Shared JavaScript
   Header, Nav, Footer all rendered from here.
   Change once → updates every page.
   ═══════════════════════════════════════════════════════════════ */

// ── SITE CONFIG ──
var SITE_PAGES = {
  home: "index.html",
  skincare: "category-skincare.html",
  serums: "category-serums.html",
  facemasks: "category-facemasks.html",
  sunscreen: "category-sunscreen.html",
  makeup: "category-makeup.html",
  lipcare: "category-lipcare.html",
  haircare: "category-haircare.html",
};

var FOOTER_PAGES = {
  about: "about.html",
  contact: "contact.html",
  privacy: "privacy-policy.html",
  terms: "terms-of-service.html",
  disclosure: "affiliate-disclosure.html",
};

var CATEGORY_META = {
  skincare:  { title: "🧴 Skincare",          file: "data/skincare.json" },
  serums:    { title: "💎 Serums & Essences",  file: "data/serums.json" },
  facemasks: { title: "🎭 Face Masks",         file: "data/facemasks.json" },
  sunscreen: { title: "☀️ Sunscreen / SPF",    file: "data/sunscreen.json" },
  makeup:    { title: "💄 Makeup",             file: "data/makeup.json" },
  lipcare:   { title: "👄 Lip Care",           file: "data/lipcare.json" },
  haircare:  { title: "💇 Hair Care",          file: "data/haircare.json" },
};

var BADGE_MAP = {
  "Best Seller": "badge-hot",
  "New": "badge-new",
  "Deal": "badge-sale",
  "Trending": "badge-trending",
  "Limited Edition": "badge-limited",
  "Prime Pick": "badge-prime",
};

// ── PRODUCT TAGS PER CATEGORY (based on Amazon subcategories) ──
var CATEGORY_TAGS = {
  skincare:  ["Cleanser", "Moisturizer", "Toner", "Cream", "Exfoliator", "Eye Care", "Patches", "Sets"],
  serums:    ["Brightening", "Hydrating", "Anti-Aging", "Acne Care", "Pore Care", "Vitamin C", "Niacinamide", "Snail Mucin"],
  facemasks: ["Sheet Mask", "Sleeping Mask", "Clay Mask", "Peel-Off", "Pads", "Patches", "Wash-Off", "Hydrogel"],
  sunscreen: ["Cream", "Gel", "Stick", "Tinted", "Fluid", "Water-Resistant", "Tone-Up", "Matte"],
  makeup:    ["Foundation", "Lip Tint", "Eye Shadow", "Mascara", "Brow", "Blush", "Powder", "Eyeliner"],
  lipcare:   ["Lip Mask", "Lip Tint", "Lip Balm", "Lip Gloss", "Lip Serum", "Matte", "Glossy", "Tinted"],
  haircare:  ["Shampoo", "Treatment", "Hair Serum", "Conditioner", "Scalp Care", "Mask", "Oil", "Mist"],
};

// ═══════════════════════════════════════════════════════════════
// ✏️ EDIT THESE TO UPDATE EVERY PAGE AT ONCE
// ═══════════════════════════════════════════════════════════════

var SITE_NAME_HTML = 'K <span>Beauty</span> Premium';
var SITE_SUBTITLE = 'Korean Skincare & Beauty Products';
var CONTACT_EMAIL = 'hello@kbeauty.fun';
var CONTACT_PHONE = '+1 (555) 123-4567';
var CONTACT_PHONE_TEL = '+15551234567'; // for tel: link (no spaces)
var COPYRIGHT_YEAR = '2026';

// ═══════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════
function renderHeader() {
  var el = document.getElementById("siteHeader");
  if (!el) return;
  el.innerHTML = '<header class="header">' +
    '<img src="header-banner.jpeg" alt="" class="header-bg">' +
    '<div class="header-overlay"></div>' +
    '<div class="header-inner">' +
    '<h1><a href="index.html">' + SITE_NAME_HTML + '</a></h1>' +
    '<p class="header-sub">' + SITE_SUBTITLE + '</p>' +
    '</div>' +
    '</header>';
}

// ═══════════════════════════════════════════════════════════════
// NAV
// ═══════════════════════════════════════════════════════════════
function renderNav(activePage, searchFunction) {
  var el = document.getElementById("siteNav");
  if (!el) return;

  var searchFn = searchFunction || "";
  var categories = [
    { key: "home", label: "All", href: "index.html" },
    { key: "skincare", label: "Skincare", href: "category-skincare.html" },
    { key: "serums", label: "Serums & Essences", href: "category-serums.html" },
    { key: "facemasks", label: "Face Masks", href: "category-facemasks.html" },
    { key: "sunscreen", label: "Sunscreen", href: "category-sunscreen.html" },
    { key: "makeup", label: "Makeup", href: "category-makeup.html" },
    { key: "lipcare", label: "Lip Care", href: "category-lipcare.html" },
    { key: "haircare", label: "Hair Care", href: "category-haircare.html" },
  ];

  var links = categories.map(function(c) {
    var cls = c.key === activePage ? ' class="active"' : '';
    return '<a href="' + c.href + '"' + cls + '>' + c.label + '</a>';
  }).join("");

  var searchHTML = "";
  if (searchFn) {
    searchHTML = '<div class="search-wrap"><input type="text" placeholder="Search products..." id="searchInput" onkeyup="' + searchFn + '()"><span class="search-icon">🔍</span></div>';
  }

  el.innerHTML = '<nav class="nav"><div class="nav-inner">' + links + searchHTML + '</div></nav>';
}

// ═══════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════
function renderFooter() {
  var el = document.getElementById("siteFooter");
  if (!el) return;

  el.innerHTML = '<footer class="footer"><div class="footer-grid">' +
    '<div>' +
    '<h3>Subscribe for Updates</h3>' +
    '<p>Get the latest K-beauty product launches, deals, and skincare tips.</p>' +
    '<div class="email-form"><input type="email" placeholder="Enter your email"><button>Subscribe</button></div>' +
    '<p style="margin-top:18px;font-size:1rem;"><a href="mailto:' + CONTACT_EMAIL + '" style="color:rgba(255,255,255,0.6);text-decoration:none;">📧 ' + CONTACT_EMAIL + '</a></p>' +
    '<p style="font-size:1rem;"><a href="tel:' + CONTACT_PHONE_TEL + '" style="color:rgba(255,255,255,0.6);text-decoration:none;">📞 ' + CONTACT_PHONE + '</a></p>' +
    '</div>' +
    '<div class="footer-links"><h3>Categories</h3>' +
    '<a href="category-skincare.html">Skincare</a>' +
    '<a href="category-serums.html">Serums & Essences</a>' +
    '<a href="category-facemasks.html">Face Masks</a>' +
    '<a href="category-sunscreen.html">Sunscreen / SPF</a>' +
    '<a href="category-makeup.html">Makeup</a>' +
    '<a href="category-lipcare.html">Lip Care</a>' +
    '<a href="category-haircare.html">Hair Care</a>' +
    '</div>' +
    '<div class="footer-links"><h3>More Pages</h3>' +
    '<a href="about.html">About Us</a>' +
    '<a href="contact.html">Contact</a>' +
    '<a href="privacy-policy.html">Privacy Policy</a>' +
    '<a href="terms-of-service.html">Terms of Service</a>' +
    '<a href="affiliate-disclosure.html">Affiliate Disclosure</a>' +
    '</div>' +
    '</div><div class="footer-bottom">' +
    '<p>&copy; ' + COPYRIGHT_YEAR + ' K Beauty Premium. All rights reserved.</p>' +
    '<p class="affiliate-disclosure">As an Amazon Associate, we earn from qualifying purchases. Product prices and availability are subject to change.</p>' +
    '</div></footer>' +
    '<button class="back-top" id="backToTop">↑</button>';

  initBackToTop();
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT CARD RENDERER
// ═══════════════════════════════════════════════════════════════
function renderProductCard(product, btnText) {
  var btnLabel = btnText || "View on Amazon";
  var badgeClass = BADGE_MAP[product.badge] || "";
  var badgeHTML = product.badge ? '<span class="product-badge ' + badgeClass + '">' + product.badge + '</span>' : "";

  var hasImage = product.image && product.image.trim() !== "";
  var imgHTML = hasImage
    ? '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy">'
    : '<div class="placeholder-icon">📦</div>';

 var r = parseFloat(product.rating) || 0;
var rounded = (r % 1 < 0.25) ? Math.floor(r) : (r % 1 < 0.75) ? Math.floor(r) + 0.5 : Math.ceil(r);
var full = Math.floor(rounded);
var half = (rounded % 1 !== 0) ? 1 : 0;
var empty = 5 - full - half;
var stars = '<span style="color:#F5A623">' + "★".repeat(full) + '</span>' + (half ? '<span class="star-half">★</span>' : '') + '<span style="color:#ddd">' + "★".repeat(empty) + '</span>';
var ratingNum = r ? " " + r : "";

  var priceHTML = "$" + product.price.toFixed(2);
  if (product.originalPrice) {
    var discount = Math.round((1 - product.price / product.originalPrice) * 100);
    priceHTML += ' <span class="old-price">$' + product.originalPrice.toFixed(2) + '</span> <span class="discount">-' + discount + '%</span>';
  }

  var primeHTML = product.prime ? '<div class="prime-tag">✓ Prime FREE Delivery</div>' : "";
  var priceNote = '<div style="font-size:0.65rem;color:var(--text-light);margin-bottom:4px;">*Price may vary on Amazon</div>';
  var boughtHTML = product.bought ? '<div class="bought-tag">' + product.bought + '</div>' : "";
  var tagAttr = product.tag ? ' data-tag="' + product.tag + '"' : '';

  return '<div class="product-card" data-price="' + product.price + '" data-rating="' + product.rating + '" data-name="' + product.name.toLowerCase() + '"' + tagAttr + '>' +
    badgeHTML +
    '<div class="product-img">' + imgHTML + '</div>' +
    '<div class="product-name">' + product.name + '</div>' +
    '<div class="product-rating"><span class="stars">' + stars + ratingNum +'</span><span class="rating-count">(' + product.reviews + ')</span></div>' +
    '<div class="product-price">' + priceHTML + '</div>' +
    priceNote +
    primeHTML +
    boughtHTML +
    '<a href="' + (product.url || "#") + '" class="buy-btn" target="_blank" rel="nofollow noopener">' + btnLabel + '</a>' +
    '</div>';
}

async function fetchProducts(jsonFile) {
  try {
    var response = await fetch(jsonFile);
    if (!response.ok) throw new Error("Failed to load " + jsonFile);
    return await response.json();
  } catch (err) {
    console.error("Error loading products:", err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
function initBackToTop() {
  var btn = document.getElementById("backToTop");
  if (!btn) return;
  window.addEventListener("scroll", function() { btn.classList.toggle("show", window.scrollY > 400); });
  btn.addEventListener("click", function() { window.scrollTo({ top: 0, behavior: "smooth" }); });
}
