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

  // Desktop nav links
  var links = '<a href="/"' + (activePage === "home" ? ' class="active"' : '') + '>All</a>';
  Object.keys(CATEGORY_META).forEach(function(key) {
    var meta = CATEGORY_META[key];
    var label = meta.title.replace(/^[^\w]*/, "").trim();
    var cls = key === activePage ? ' class="active"' : '';
    links += '<a href="/' + key + '"' + cls + '>' + label + '</a>';
  });

  // Desktop nav - always include global search
  var globalSearchHTML = '<div class="search-wrap global-search"><input type="text" placeholder="Search all products..." id="globalSearchInput" onkeyup="globalSearch(this.value)" autocomplete="off"><span class="search-icon">🔍</span><div class="search-results" id="globalSearchResults"></div></div>';
  
  // Desktop nav
  var desktopNav = '<nav class="nav"><div class="nav-inner">' + links + globalSearchHTML + '</div></nav>';

  // Mobile nav bar
  var mobileSearchHTML = '<div class="mobile-search global-search"><input type="text" placeholder="Search e.g. Eye Liner" id="mobileGlobalSearch" onkeyup="globalSearch(this.value)" autocomplete="off"><span class="search-icon">🔍</span><div class="search-results" id="mobileSearchResults"></div></div>';
  var mobileNav = '<div class="mobile-nav-bar"><button class="mobile-menu-btn" onclick="openDrawer()"><span class="hamburger">☰</span> Menu</button>' + mobileSearchHTML + '</div>';

  // Drawer
  var drawerLinks = '<a class="drawer-link" href="/">All Products</a>';
  Object.keys(CATEGORY_META).forEach(function(key) {
    var meta = CATEGORY_META[key];
    var label = meta.title.replace(/^[^\w]*/, "").trim();
    var tags = CATEGORY_TAGS[key];
    var isNested = tags && typeof tags === "object" && !Array.isArray(tags);
    var cls = key === activePage ? ' active' : '';

    if (isNested && Object.keys(tags).length > 0) {
      drawerLinks += '<a class="drawer-link' + cls + '" onclick="toggleDrawerSub(\'' + key + '\')" style="cursor:pointer;">' + label + '<span class="drawer-arrow" id="arrow-' + key + '">►</span></a>';
      drawerLinks += '<div class="drawer-sub-section" id="sub-' + key + '">';
      drawerLinks += '<a class="drawer-sub-link" href="/' + key + '">All ' + label + '</a>';
      Object.keys(tags).forEach(function(tag) {
        var subtags = tags[tag];
        if (subtags && subtags.length > 0) {
          drawerLinks += '<a class="drawer-sub-link" onclick="toggleDrawerSub(\'' + key + '-' + tag.replace(/[^a-zA-Z0-9]/g,'_') + '\')" style="cursor:pointer;font-weight:500;color:var(--text);">' + tag + '<span class="drawer-arrow" id="arrow-' + key + '-' + tag.replace(/[^a-zA-Z0-9]/g,'_') + '" style="font-size:0.6rem;">►</span></a>';
          drawerLinks += '<div class="drawer-sub-section" id="sub-' + key + '-' + tag.replace(/[^a-zA-Z0-9]/g,'_') + '">';
          subtags.forEach(function(st) {
            drawerLinks += '<a class="drawer-sub-link" style="padding-left:32px;font-size:0.78rem;" onclick="navigateWithTag(\'' + key + '\',\'' + tag.replace(/'/g, "\\'") + '\',\'' + st.replace(/'/g, "\\'") + '\')">' + st + '</a>';
          });
          drawerLinks += '</div>';
        } else {
          drawerLinks += '<a class="drawer-sub-link" onclick="navigateWithTag(\'' + key + '\',\'' + tag.replace(/'/g, "\\'") + '\')">' + tag + '</a>';
        }
      });
      drawerLinks += '</div>';
    } else {
      drawerLinks += '<a class="drawer-link' + cls + '" href="/' + key + '">' + label + '</a>';
    }
  });

  var drawer = '<div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer()"></div>' +
    '<div class="drawer" id="drawer">' +
      '<div class="drawer-header"><h3>K <span style="color:var(--champagne);">Beauty</span></h3><button class="drawer-close" onclick="closeDrawer()">✕</button></div>' +
      '<div class="drawer-section"><div class="drawer-section-title">Categories</div>' + drawerLinks + '</div>' +
    '</div>';

  el.innerHTML = desktopNav + mobileNav + drawer;
}

function openDrawer() {
  document.getElementById("drawer").classList.add("open");
  document.getElementById("drawerOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawerOverlay").classList.remove("open");
  document.body.style.overflow = "";
}
function toggleDrawerSub(key) {
  var sub = document.getElementById("sub-" + key);
  var arrow = document.getElementById("arrow-" + key);
  if (sub) {
    sub.classList.toggle("open");
    if (arrow) arrow.classList.toggle("open");
  }
}
function navigateWithTag(cat, tag, subtag) {
  closeDrawer();
  var url = "/" + cat + "?tag=" + encodeURIComponent(tag);
  if (subtag) url += "&subtag=" + encodeURIComponent(subtag);
  window.location.href = url;
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

// ═══════════════════════════════════════════════════════════════
// GLOBAL SEARCH — searches all products across all categories
// ═══════════════════════════════════════════════════════════════
var globalSearchCache = null;
var globalSearchTimer = null;

async function loadAllProducts() {
  if (globalSearchCache) return globalSearchCache;
  globalSearchCache = [];
  var keys = Object.keys(CATEGORY_META);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    try {
      var products = await fetchProducts(CATEGORY_META[key].file);
      products.forEach(function(p) { p._cat = key; });
      globalSearchCache = globalSearchCache.concat(products);
    } catch(e) {}
  }
  return globalSearchCache;
}

function globalSearch(query) {
  clearTimeout(globalSearchTimer);
  var q = (query || "").toLowerCase().trim();
  
  var desktopResults = document.getElementById("globalSearchResults");
  var mobileResults = document.getElementById("mobileSearchResults");
  var resultsEl = (window.innerWidth <= 768 && mobileResults) ? mobileResults : desktopResults;
  
  var desktopInput = document.getElementById("globalSearchInput");
  var mobileInput = document.getElementById("mobileGlobalSearch");
  if (desktopInput && desktopInput !== document.activeElement) desktopInput.value = query;
  if (mobileInput && mobileInput !== document.activeElement) mobileInput.value = query;

  if (!q || q.length < 2) {
    if (desktopResults) { desktopResults.innerHTML = ""; desktopResults.style.display = "none"; }
    if (mobileResults) { mobileResults.innerHTML = ""; mobileResults.style.display = "none"; }
    return;
  }

  globalSearchTimer = setTimeout(async function() {
    if (resultsEl) { resultsEl.innerHTML = '<div class="search-no-result">Searching...</div>'; resultsEl.style.display = "block"; }

    var allProducts = await loadAllProducts();
    var matches = allProducts.filter(function(p) {
      return p.name.toLowerCase().includes(q) ||
        (p.tag && p.tag.toLowerCase().includes(q)) ||
        (p.subtag && p.subtag.toLowerCase().includes(q)) ||
        (p._cat && p._cat.toLowerCase().includes(q));
    }).slice(0, 8);

    if (matches.length === 0) {
      if (resultsEl) { resultsEl.innerHTML = '<div class="search-no-result">No products found for "' + query + '"</div>'; resultsEl.style.display = "block"; }
      return;
    }

    var html = matches.map(function(p) {
      var catMeta = CATEGORY_META[p._cat];
      var catLabel = catMeta ? catMeta.title.replace(/^[^\w]*/, "").trim() : p._cat;
      var img = (p.image && p.image.trim()) ? '<img src="' + p.image + '" alt="">' : '<span style="font-size:1.5rem;">📦</span>';
      return '<a class="search-result-item" href="/p/' + p._cat + '/' + p.id + '">' +
        '<div class="search-result-img">' + img + '</div>' +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + p.name + '</div>' +
          '<div class="search-result-meta">$' + p.price.toFixed(2) + ' · ' + catLabel + (p.tag ? ' › ' + p.tag : '') + '</div>' +
        '</div>' +
      '</a>';
    }).join("");

    if (resultsEl) { resultsEl.innerHTML = html; resultsEl.style.display = "block"; }
  }, 300);
}

document.addEventListener("click", function(e) {
  if (!e.target.closest(".global-search")) {
    document.querySelectorAll(".search-results").forEach(function(el) { el.style.display = "none"; });
  }
});
