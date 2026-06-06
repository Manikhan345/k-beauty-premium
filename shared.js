/* ═══════════════════════════════════════════════════════════════
   K Beauty Premium — Shared JavaScript
   Reads categories from config.json — change once, updates everywhere.
   ═══════════════════════════════════════════════════════════════ */

// ── Internal Traffic Blocker ──
// Visit https://kbeauty.fun/?internal=1 to enable on this device
// Visit https://kbeauty.fun/?internal=0 to disable
(function() {
  var params = new URLSearchParams(window.location.search);
  if (params.get("internal") === "1") {
    try {
      localStorage.setItem("kb_internal", "1");
      document.cookie = "kb_internal=1; max-age=31536000; path=/; SameSite=Lax";
    } catch(e) {}
  }
  if (params.get("internal") === "0") {
    try {
      localStorage.removeItem("kb_internal");
      document.cookie = "kb_internal=; max-age=0; path=/";
    } catch(e) {}
  }
  
  var isInternal = false;
  try {
    if (localStorage.getItem("kb_internal") === "1") isInternal = true;
    if (document.cookie.indexOf("kb_internal=1") !== -1) isInternal = true;
  } catch(e) {}
  
  window.KB_INTERNAL = isInternal;
  
  // Show visual badge when internal
  if (isInternal) {
    document.addEventListener("DOMContentLoaded", function() {
      var badge = document.createElement("div");
      badge.style.cssText = "position:fixed;bottom:10px;left:10px;background:#10B981;color:#fff;padding:6px 12px;border-radius:20px;font-size:0.7rem;font-family:sans-serif;font-weight:600;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;";
      badge.textContent = "🛡️ Internal — Tracking OFF";
      badge.title = "Click to disable internal mode";
      badge.onclick = function() {
        if (confirm("Disable internal mode? You'll be tracked normally after this.")) {
          window.location.href = window.location.pathname + "?internal=0";
        }
      };
      document.body.appendChild(badge);
    });
  }
})();

// ── Google Analytics (gtag.js) ──
(function() {
  if (window.KB_INTERNAL) return; // Skip GA for internal traffic
  var GA_ID = "G-0CT2LFECDL";
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", GA_ID);
})();

// ── Google AdSense ──
(function() {
  var s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4829107618117363";
  document.head.appendChild(s);
})();

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
    var resp = await fetch("/config.json");
    if (!resp.ok) throw new Error("Failed to load config.json");
    var config = await resp.json();
    var cats = config.categories || {};
    
    SITE_PAGES = { home: "/" };
    CATEGORY_META = {};
    CATEGORY_TAGS = {};
    
    Object.keys(cats).forEach(function(key) {
      var c = cats[key];
      SITE_PAGES[key] = "/" + key;
      CATEGORY_META[key] = { title: c.title, file: "/data/" + key + ".json" };
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
    CATEGORY_META = { skincare:{title:"🧴 Skincare",file:"/data/skincare.json"}, serums:{title:"💎 Serums & Essences",file:"/data/serums.json"}, facemasks:{title:"🎭 Face Masks",file:"/data/facemasks.json"}, sunscreen:{title:"☀️ Sunscreen / SPF",file:"/data/sunscreen.json"}, makeup:{title:"💄 Makeup",file:"/data/makeup.json"}, lipcare:{title:"👄 Lip Care",file:"/data/lipcare.json"}, haircare:{title:"💇 Hair Care",file:"/data/haircare.json"} };
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

  // Build main nav from top categories
  var mainCats = ["skincare", "makeup", "haircare", "sunscreen", "serums"];
  var navLinks = "";
  mainCats.forEach(function(key) {
    if (!CATEGORY_META[key]) return;
    var label = CATEGORY_META[key].title.replace(/^[^\w]*/, "").trim();
    navLinks += '<a href="/' + key + '">' + label + '</a>';
  });
  navLinks += '<a href="/best-sellers">Shop All</a>';
  navLinks += '<a href="/blog">Blog</a>';

  el.innerHTML =
    '<header class="site-header">' +
      '<div class="site-header-inner">' +
        '<a href="/" class="site-logo">' +
          '<div class="logo-main">K <span>Beauty</span></div>' +
          '<div class="logo-tagline">PREMIUM</div>' +
        '</a>' +
        '<nav class="site-nav-links">' + navLinks + '</nav>' +
        '<div class="site-search global-search">' +
          '<input type="text" id="globalSearchInput" placeholder="Search products, guides..." onkeyup="handleSearchKey(event, this.value)" autocomplete="off">' +
          '<span class="search-icon" onclick="submitSearch()">🔍</span>' +
          '<div class="search-results" id="globalSearchResults"></div>' +
        '</div>' +
        '<button class="mobile-menu-btn" onclick="openDrawer()" aria-label="Menu">☰</button>' +
      '</div>' +
    '</header>';

  injectSEO();
}

function injectSEO() {
  var path = window.location.pathname;
  var canonicalURL = "https://kbeauty.fun" + (path === "/" ? "/" : path.replace(/\/$/, ""));
  var pageTitle = document.title || "K Beauty Premium";
  var pageDesc = "Discover the best Korean skincare, makeup & hair care on Amazon. Curated K-beauty picks from COSRX, Laneige, Innisfree, Beauty of Joseon and more — updated weekly.";
  
  // Get existing description
  var descEl = document.querySelector('meta[name="description"]');
  if (descEl && descEl.content) pageDesc = descEl.content;
  
  // Helper to add/update meta tag
  function setMeta(selector, attr, attrVal, content) {
    var tag = document.querySelector(selector);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attr, attrVal);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  }
  
  // Canonical
  var canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", canonicalURL);
  
  // Open Graph
  var ogImage = "https://kbeauty.fun/header-banner.jpeg";
  setMeta('meta[property="og:type"]', "property", "og:type", "website");
  setMeta('meta[property="og:url"]', "property", "og:url", canonicalURL);
  setMeta('meta[property="og:title"]', "property", "og:title", pageTitle);
  setMeta('meta[property="og:description"]', "property", "og:description", pageDesc);
  setMeta('meta[property="og:image"]', "property", "og:image", ogImage);
  setMeta('meta[property="og:site_name"]', "property", "og:site_name", "K Beauty Premium");
  
  // Twitter Card
  setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", pageTitle);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", pageDesc);
  setMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
  
  // JSON-LD Structured Data
  var oldSchema = document.getElementById("siteSchema");
  if (oldSchema) oldSchema.remove();
  var schemaScript = document.createElement("script");
  schemaScript.type = "application/ld+json";
  schemaScript.id = "siteSchema";
  var schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "K Beauty Premium",
    "url": "https://kbeauty.fun/",
    "description": pageDesc,
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://kbeauty.fun/?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
  schemaScript.textContent = JSON.stringify(schema);
  document.head.appendChild(schemaScript);
  
  // Organization schema
  var orgSchema = document.createElement("script");
  orgSchema.type = "application/ld+json";
  orgSchema.id = "orgSchema";
  var oldOrg = document.getElementById("orgSchema");
  if (oldOrg) oldOrg.remove();
  orgSchema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "K Beauty Premium",
    "url": "https://kbeauty.fun/",
    "logo": ogImage,
    "description": "Curated Korean beauty and skincare products from top K-beauty brands.",
    "email": "hello@kbeauty.fun"
  });
  document.head.appendChild(orgSchema);
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
  links += '<a href="/best-sellers"' + (activePage === "bestsellers" ? ' class="active"' : '') + '>🏆 Best Sellers</a>';
  links += '<a href="/blog"' + (activePage === "blog" ? ' class="active"' : '') + '>📝 Blog</a>';

  // Desktop nav - always include global search
  var globalSearchHTML = '<div class="search-wrap global-search"><input type="text" placeholder="Search all products..." id="globalSearchInput" onkeyup="handleSearchKey(event, this.value)" autocomplete="off"><span class="search-icon" onclick="submitSearch()" style="cursor:pointer;">🔍</span><div class="search-results" id="globalSearchResults"></div></div>';
  
  // Desktop nav
  var desktopNav = '<nav class="nav"><div class="nav-inner">' + links + globalSearchHTML + '</div></nav>';

  // Mobile nav bar
  var mobileSearchHTML = '<div class="mobile-search global-search"><input type="text" placeholder="Search e.g. Eye Liner" id="mobileGlobalSearch" onkeyup="handleSearchKey(event, this.value)" autocomplete="off"><span class="search-icon" onclick="submitSearch()" style="cursor:pointer;">🔍</span><div class="search-results" id="mobileSearchResults"></div></div>';
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
      '<div class="drawer-section">' +
        '<a class="drawer-link" href="/best-sellers">🏆 Best Sellers</a>' +
        '<a class="drawer-link" href="/blog">📝 Blog</a>' +
      '</div>' +
    '</div>';

el.innerHTML = drawer;
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
    '<h3>Get the K-Beauty Insider</h3>' +
    '<p>Subscribe for exclusive product drops, routine guides, and the best K-beauty deals on Amazon. Delivered weekly.</p>' +
    '<div class="email-form"><input type="email" id="footerSubEmail" placeholder="Enter your email"><button id="footerSubBtn">Subscribe</button></div>' +
    '<div id="footerSubStatus" style="font-size:0.75rem;margin-top:6px;color:rgba(255,255,255,0.6);"></div>' +
    '<p style="margin-top:18px;font-size:1rem;"><a href="mailto:' + CONTACT_EMAIL + '" style="color:rgba(255,255,255,0.6);text-decoration:none;">📧 ' + CONTACT_EMAIL + '</a></p>' +
    '<div style="margin-top:14px;display:flex;gap:12px;">' +
      '<a href="https://www.tiktok.com/@kbeautypremium" target="_blank" rel="noopener" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:1.4rem;" aria-label="TikTok">🎵</a>' +
      '<a href="https://www.instagram.com/kbeautypremium" target="_blank" rel="noopener" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:1.4rem;" aria-label="Instagram">📷</a>' +
      '<a href="https://www.pinterest.com/kbeautypremium" target="_blank" rel="noopener" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:1.4rem;" aria-label="Pinterest">📌</a>' +
    '</div>' +
    '</div>' +
    '<div class="footer-links"><h3>Categories</h3>' + catLinks + '</div>' +
    '<div class="footer-links"><h3>More Pages</h3>' +
    '<a href="/blog">Blog</a>' +
    '<a href="/best-sellers">Best Sellers</a>' +
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

  var schemaData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.image || "",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": r || 4.5,
      "reviewCount": parseInt((product.reviews || "0").replace(/,/g, "")) || 1
    },
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "url": product.url || "#"
    }
  };
  var schemaHTML = '<script type="application/ld+json">' + JSON.stringify(schemaData).replace(/</g, "\\u003c") + '</' + 'script>';

  return '<div class="product-card" data-price="' + product.price + '" data-rating="' + product.rating + '" data-name="' + product.name.toLowerCase() + '"' + tagAttr + (productLink ? ' data-href="' + productLink + '" onclick="if(!event.target.classList.contains(\'buy-btn\'))window.open(this.dataset.href,\'_blank\')"' : '') + '>' +
    schemaHTML +
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

var globalSearchLoading = null;
async function loadAllProducts() {
  if (globalSearchCache) return globalSearchCache;
  if (globalSearchLoading) return globalSearchLoading;
  
  globalSearchLoading = (async function() {
    globalSearchCache = [];
    var keys = Object.keys(CATEGORY_META);
    var promises = keys.map(function(key) {
      return fetchProducts(CATEGORY_META[key].file).then(function(products) {
        products.forEach(function(p) { p._cat = key; });
        return products;
      }).catch(function() { return []; });
    });
    var results = await Promise.all(promises);
    var allProducts = [];
    results.forEach(function(products) {
      allProducts = allProducts.concat(products);
    });
    allProducts.forEach(function(p) {
      p._searchText = (p.name + " " + (p.tag || "") + " " + (p.subtag || "") + " " + (p._cat || "") + " " + (p.bought || "")).toLowerCase();
    });
    globalSearchCache = allProducts;
    globalSearchLoading = null;
    return globalSearchCache;
  })();
  
  return globalSearchLoading;
}

function searchScore(product, words) {
  var text = product._searchText;
  var name = product.name.toLowerCase();
  var score = 0;
  var allMatch = true;
  
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    var found = false;
    
    // Direct match
    if (text.indexOf(w) !== -1) {
      found = true;
      if (name.indexOf(w) !== -1) score += 10;
      else score += 3;
      if (name.indexOf(w) === 0) score += 5;
    }
    
    // If not found, try splitting compound word (e.g. "facemask" → "face" + "mask")
    if (!found && w.length >= 6) {
      for (var j = 3; j < w.length - 2; j++) {
        var part1 = w.substring(0, j);
        var part2 = w.substring(j);
        if (text.indexOf(part1) !== -1 && text.indexOf(part2) !== -1) {
          found = true;
          score += 6;
          break;
        }
      }
    }
    
    // If still not found, try partial match (at least 4 chars)
    if (!found && w.length >= 4) {
      // Check if any substring of 4+ chars matches
      for (var k = 0; k <= w.length - 4; k++) {
        var sub = w.substring(k, k + 4);
        if (text.indexOf(sub) !== -1) {
          found = true;
          score += 2;
          break;
        }
      }
    }
    
    if (!found) { allMatch = false; break; }
  }
  
  if (!allMatch) return 0;
  
  // Bonus for exact phrase match
  var phrase = words.join(" ");
  if (name.indexOf(phrase) !== -1) score += 20;
  
  // Bonus for popular products
  if (product.bought) {
    var boughtMatch = product.bought.match(/(\d+)([KkMm])?/);
    if (boughtMatch) {
      var num = parseInt(boughtMatch[1]);
      var mult = (boughtMatch[2] && (boughtMatch[2] === 'K' || boughtMatch[2] === 'k')) ? 1000 : 1;
      score += Math.min(num * mult / 1000, 10); // up to 10 bonus points for popular items
    }
  }
  
  // Bonus for high rating
  if (product.rating >= 4.5) score += 3;
  
  return score;
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
    
    // Split query into individual words for flexible matching
    var words = q.split(/\s+/).filter(function(w) { return w.length >= 2; });
    if (words.length === 0) words = [q];
    
    // Score and rank all products
    var scored = [];
    for (var i = 0; i < allProducts.length; i++) {
      var s = searchScore(allProducts[i], words);
      if (s > 0) scored.push({ product: allProducts[i], score: s });
    }
    
    // Sort by score descending, take top 10
    scored.sort(function(a, b) { return b.score - a.score; });
    var matches = scored.slice(0, 10).map(function(s) { return s.product; });

    if (matches.length === 0) {
      // Try partial match — if any single word matches, show those
      var partialMatches = [];
      for (var j = 0; j < allProducts.length && partialMatches.length < 8; j++) {
        var txt = allProducts[j]._searchText;
        for (var k = 0; k < words.length; k++) {
          if (txt.indexOf(words[k]) !== -1) { partialMatches.push(allProducts[j]); break; }
        }
      }
      if (partialMatches.length > 0) {
        matches = partialMatches;
      } else {
        if (resultsEl) { resultsEl.innerHTML = '<div class="search-no-result">No products found for "' + query + '"</div>'; resultsEl.style.display = "block"; }
        return;
      }
    }

    var html = matches.map(function(p) {
      var catMeta = CATEGORY_META[p._cat];
      var catLabel = catMeta ? catMeta.title.replace(/^[^\w]*/, "").trim() : p._cat;
      var img = (p.image && p.image.trim()) ? '<img src="' + p.image + '" alt="">' : '<span style="font-size:1.5rem;">📦</span>';
      return '<a class="search-result-item" href="/p/' + p._cat + '/' + p.id + '" target="_blank">' +
        '<div class="search-result-img">' + img + '</div>' +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + p.name + '</div>' +
          '<div class="search-result-meta">$' + p.price.toFixed(2) + ' · ' + catLabel + (p.tag ? ' › ' + p.tag : '') + '</div>' +
        '</div>' +
      '</a>';
    }).join("");

    if (resultsEl) { resultsEl.innerHTML = html; resultsEl.style.display = "block"; }
  }, 250);
}

document.addEventListener("click", function(e) {
  if (!e.target.closest(".global-search")) {
    document.querySelectorAll(".search-results").forEach(function(el) { el.style.display = "none"; });
  }
});

function handleSearchKey(event, value) {
  if (event.key === "Enter") {
    submitSearch();
  } else {
    globalSearch(value);
  }
}

function submitSearch() {
  var q = (document.getElementById("globalSearchInput") || document.getElementById("mobileGlobalSearch") || {}).value || "";
  q = q.trim();
  if (q.length >= 2) {
    window.location.href = "/?search=" + encodeURIComponent(q);
  }
}
