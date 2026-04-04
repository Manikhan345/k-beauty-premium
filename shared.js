/* ═══════════════════════════════════════════════════════════════
   K Beauty Premium — Shared JavaScript
   Reads categories from config.json — change once, updates everywhere.
   ═══════════════════════════════════════════════════════════════ */

// ── These are populated from config.json ──
var SITE_PAGES = {};
var CATEGORY_META = {};
var CATEGORY_TAGS = {};
var CONFIG_LOADED = false;

// ── STATIC CONFIG ──
var FOOTER_PAGES = {
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
  disclosure: "/disclosure",
};

var BADGE_MAP = {
  "Best Seller": "badge-hot",
  "New": "badge-new",
  "Deal": "badge-sale",
  "Trending": "badge-trending",
  "Limited Edition": "badge-limited",
  "Prime Pick": "badge-prime",
};

// ═══════════════════════════════════════════════════════════════
// ✏️ EDIT THESE TO UPDATE EVERY PAGE AT ONCE
// ═══════════════════════════════════════════════════════════════
var SITE_NAME_HTML = 'K <span>Beauty</span> Premium';
var SITE_SUBTITLE = 'Korean Skincare & Beauty Products';
var CONTACT_EMAIL = 'hello@kbeauty.fun';
var CONTACT_PHONE = '+1 (555) 123-4567';
var CONTACT_PHONE_TEL = '+15551234567';
var COPYRIGHT_YEAR = '2026';

// ═══════════════════════════════════════════════════════════════
// LOAD CONFIG
// ═══════════════════════════════════════════════════════════════
async function loadConfig() {
  if (CONFIG_LOADED) return;
  try {
    var resp = await fetch("config.json");
    if (!resp.ok) throw new Error("Failed to load config.json");
    var config = await resp.json();
    var cats = config.categories || {};
    
    SITE_PAGES = { home: "/" };
    CATEGORY_META = {};
    CATEGORY_TAGS = {};
    
    Object.keys(cats).forEach(function(key) {
      var c = cats[key];
      SITE_PAGES[key] = "/" + key;
      CATEGORY_META[key] = { title: c.title, file: "data/" + key + ".json" };
      // Tags can be nested object or flat array
      if (c.tags && typeof c.tags === "object" && !Array.isArray(c.tags)) {
        // Nested: { "Face": ["Cleansers", "Moisturizers"], "Eyes": [...] }
        CATEGORY_TAGS[key] = c.tags;
      } else {
        // Flat: ["Cleanser", "Moisturizer"]
        CATEGORY_TAGS[key] = c.tags || [];
      }
    });
    
    CONFIG_LOADED = true;
  } catch (e) {
    console.error("Config load error:", e);
    // Fallback to hardcoded defaults if config.json fails
    SITE_PAGES = { home:"/", skincare:"/skincare", serums:"/serums", facemasks:"/facemasks", sunscreen:"/sunscreen", makeup:"/makeup", lipcare:"/lipcare", haircare:"/haircare" };
    CATEGORY_META = { skincare:{title:"🧴 Skincare",file:"data/skincare.json"}, serums:{title:"💎 Serums & Essences",file:"data/serums.json"}, facemasks:{title:"🎭 Face Masks",file:"data/facemasks.json"}, sunscreen:{title:"☀️ Sunscreen / SPF",file:"data/sunscreen.json"}, makeup:{title:"💄 Makeup",file:"data/makeup.json"}, lipcare:{title:"👄 Lip Care",file:"data/lipcare.json"}, haircare:{title:"💇 Hair Care",file:"data/haircare.json"} };
    CATEGORY_TAGS = { skincare:["Cleanser","Moisturizer","Toner","Cream","Exfoliator","Eye Care","Patches","Sets"], serums:["Brightening","Hydrating","Anti-Aging","Acne Care","Pore Care","Vitamin C","Niacinamide","Snail Mucin"], facemasks:["Sheet Mask","Sleeping Mask","Clay Mask","Peel-Off","Pads","Patches","Wash-Off","Hydrogel"], sunscreen:["Cream","Gel","Stick","Tinted","Fluid","Water-Resistant","Tone-Up","Matte"], makeup:["Foundation","Lip Tint","Eye Shadow","Mascara","Brow","Blush","Powder","Eyeliner"], lipcare:["Lip Mask","Lip Tint","Lip Balm","Lip Gloss","Lip Serum","Matte","Glossy","Tinted"], haircare:["Shampoo","Treatment","Hair Serum","Conditioner","Scalp Care","Mask","Oil","Mist"] };
    CONFIG_LOADED = true;
  }
}

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
    '<h1><a href="/">' + SITE_NAME_HTML + '</a></h1>' +
    '<p class="header-sub">' + SITE_SUBTITLE + '</p>' +
    '</div>' +
    '</header>';
}

// ═══════════════════════════════════════════════════════════════
// NAV (builds dynamically from config)
// ═══════════════════════════════════════════════════════════════
function renderNav(activePage, searchFunction) {
  var el = document.getElementById("siteNav");
  if (!el) return;

  var searchFn = searchFunction || "";

  // Build nav links from config
  var links = '<a href="/"' + (activePage === "home" ? ' class="active"' : '') + '>All</a>';
  Object.keys(CATEGORY_META).forEach(function(key) {
    var meta = CATEGORY_META[key];
    var label = meta.title.replace(/^[^\w]*/, "").trim(); // Remove emoji
    var cls = key === activePage ? ' class="active"' : '';
    links += '<a href="/' + key + '"' + cls + '>' + label + '</a>';
  });

  var searchHTML = "";
  if (searchFn) {
    searchHTML = '<div class="search-wrap"><input type="text" placeholder="Search products..." id="searchInput" onkeyup="' + searchFn + '()"><span class="search-icon">🔍</span></div>';
  }

  el.innerHTML = '<nav class="nav"><div class="nav-inner">' + links + searchHTML + '</div></nav>';
}

// ═══════════════════════════════════════════════════════════════
// FOOTER (builds dynamically from config)
// ═══════════════════════════════════════════════════════════════
function renderFooter() {
  var el = document.getElementById("siteFooter");
  if (!el) return;

  // Build category links dynamically
  var catLinks = '';
  Object.keys(CATEGORY_META).forEach(function(key) {
    var meta = CATEGORY_META[key];
    var label = meta.title.replace(/^[^\w]*/, "").trim();
    catLinks += '<a href="/' + key + '">' + label + '</a>';
  });

  el.innerHTML = '<footer class="footer"><div class="footer-grid">' +
    '<div>' +
    '<h3>Subscribe for Updates</h3>' +
    '<p>Get the latest K-beauty product launches, deals, and skincare tips.</p>' +
    '<div class="email-form"><input type="email" id="footerSubEmail" placeholder="Enter your email"><button id="footerSubBtn">Subscribe</button></div>' +
    '<div id="footerSubStatus" style="font-size:0.75rem;margin-top:6px;color:rgba(255,255,255,0.6);"></div>' +
    '<p style="margin-top:18px;font-size:1rem;"><a href="mailto:' + CONTACT_EMAIL + '" style="color:rgba(255,255,255,0.6);text-decoration:none;">📧 ' + CONTACT_EMAIL + '</a></p>' +
    '<p style="font-size:1rem;"><a href="tel:' + CONTACT_PHONE_TEL + '" style="color:rgba(255,255,255,0.6);text-decoration:none;">📞 ' + CONTACT_PHONE + '</a></p>' +
    '</div>' +
    '<div class="footer-links"><h3>Categories</h3>' + catLinks + '</div>' +
    '<div class="footer-links"><h3>More Pages</h3>' +
    '<a href="/about">About Us</a>' +
    '<a href="/contact">Contact</a>' +
    '<a href="/privacy">Privacy Policy</a>' +
    '<a href="/terms">Terms of Service</a>' +
    '<a href="/disclosure">Affiliate Disclosure</a>' +
    '</div>' +
    '</div><div class="footer-bottom">' +
    '<p>&copy; ' + COPYRIGHT_YEAR + ' K Beauty Premium. All rights reserved.</p>' +
    '<p class="affiliate-disclosure">As an Amazon Associate, we earn from qualifying purchases. Product prices and availability are subject to change.</p>' +
    '</div></footer>' +
    '<button class="back-top" id="backToTop">↑</button>';

  initBackToTop();
  initSubscribeForm();
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT CARD RENDERER
// ═══════════════════════════════════════════════════════════════
function renderProductCard(product, btnText, categoryKey) {
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
  var productLink = (product.id && categoryKey) ? '/p/' + categoryKey + '/' + product.id : '';

  return '<div class="product-card" data-price="' + product.price + '" data-rating="' + product.rating + '" data-name="' + product.name.toLowerCase() + '"' + tagAttr + (productLink ? ' data-href="' + productLink + '" onclick="if(!event.target.classList.contains(\'buy-btn\'))window.location.href=this.dataset.href"' : '') + '>' +
    badgeHTML +
    '<div class="product-img">' + imgHTML + '</div>' +
    '<div class="product-name">' + product.name + '</div>' +
    '<div class="product-rating"><span class="stars">' + stars + ratingNum + '</span><span class="rating-count">(' + product.reviews + ')</span></div>' +
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

function initSubscribeForm() {
  var btn = document.getElementById("footerSubBtn");
  if (!btn) return;
  btn.addEventListener("click", async function() {
    var input = document.getElementById("footerSubEmail");
    var status = document.getElementById("footerSubStatus");
    var email = input.value.trim();

    if (!email || !email.includes("@")) {
      status.textContent = "Please enter a valid email.";
      status.style.color = "#FC8181";
      return;
    }

    btn.disabled = true;
    btn.textContent = "...";
    status.textContent = "";

    try {
      var resp = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscribe", email: email })
      });
      var result = await resp.json();
      if (result.success) {
        status.textContent = "🌸 Subscribed! Check your inbox for a welcome email.";
        status.style.color = "#68D391";
        input.value = "";
      } else {
        status.textContent = result.error || "Failed. Try again.";
        status.style.color = "#FC8181";
      }
    } catch (e) {
      status.textContent = "Something went wrong. Try again.";
      status.style.color = "#FC8181";
    }

    btn.disabled = false;
    btn.textContent = "Subscribe";
  });
}
