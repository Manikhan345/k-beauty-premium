/* ═══════════════════════════════════════════════════════════════
   K Beauty Premium — Category Page Logic
   Amazon-style left sidebar filters with tag → subtag hierarchy
   ═══════════════════════════════════════════════════════════════ */
var allProducts = [];
var activeTag = "";
var activeSubtag = "";

async function initCategoryPage() {
  if (!CONFIG_LOADED) await loadConfig();
  var meta = CATEGORY_META[CATEGORY_KEY];
  if (!meta) return;
  document.getElementById("catTitle").textContent = meta.title;
 
  var breadcrumb = document.getElementById("breadcrumb");
  if (breadcrumb) breadcrumb.innerHTML = '<a href="/">Home</a> › <span>' + meta.title.replace(/^[^\w]*/, "").trim() + '</span>';
  renderSidebarFilters();
  allProducts = await fetchProducts(meta.file);
  
  var urlParams = new URLSearchParams(window.location.search);
  var preTag = urlParams.get("tag");
  var preSubtag = urlParams.get("subtag");
  if (preTag) {
    filterByTag(preTag);
    if (preSubtag) filterBySubtag(preSubtag);
  } else {
    renderSectionedView();
  }
  updateTopRated(allProducts);
}

function renderSectionedView() {
  var grid = document.getElementById("productGrid");
  var tags = CATEGORY_TAGS[CATEGORY_KEY];
  var isNested = tags && typeof tags === "object" && !Array.isArray(tags);
  
  if (!isNested || !tags || Object.keys(tags).length === 0) {
    // Fallback: just show all products in grid
    renderGrid(allProducts);
    updateCount(allProducts.length);
    return;
  }
  
  // Remove grid styles, build sections
  grid.style.display = "block";
  grid.style.gridTemplateColumns = "none";
  
  var html = "";
  var totalShown = 0;
  Object.keys(tags).forEach(function(tag) {
    var tagProducts = allProducts.filter(function(p) { return p.tag === tag; });
    if (tagProducts.length === 0) return;
    
    // Shuffle and take first 8 for variety
    var shuffled = tagProducts.slice().sort(function() { return Math.random() - 0.5; }).slice(0, 8);
    totalShown += tagProducts.length;
    
    html += '<div class="category-section-block" style="margin-bottom:32px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;border-bottom:2px solid var(--border);padding-bottom:8px;">';
    html += '<h3 style="font-family:Noto Serif Display,serif;font-size:1.3rem;font-weight:700;color:var(--text);">' + tag + '</h3>';
    html += '<a onclick="filterByTag(\'' + tag.replace(/'/g, "\\'") + '\')" style="color:var(--accent);font-size:0.82rem;font-weight:600;cursor:pointer;text-decoration:none;">View all ' + tagProducts.length + ' →</a>';
    html += '</div>';
    html += '<div class="section-product-grid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;">';
    html += shuffled.map(function(p) { return renderProductCard(p, null, CATEGORY_KEY); }).join("");
    html += '</div>';
    html += '</div>';
  });
  
  grid.innerHTML = html;
  updateCount(totalShown);
}

// ── SIDEBAR FILTER RENDERING ──
function renderSidebarFilters() {
  var container = document.getElementById("filterTags");
  if (!container) return;
  var tags = CATEGORY_TAGS[CATEGORY_KEY];
  if (!tags) { container.style.display = "none"; return; }

  var isNested = tags && typeof tags === "object" && !Array.isArray(tags);

  if (isNested) {
    var tagKeys = Object.keys(tags);
    if (tagKeys.length === 0) { container.style.display = "none"; return; }

    var html = '<div class="filter-section-title">Department</div>';
    html += '<a class="filter-link active" onclick="filterByTag(\'\')">All Products</a>';
    tagKeys.forEach(function(t) {
      html += '<a class="filter-link" data-tag="' + t + '" onclick="filterByTag(\'' + t.replace(/'/g, "\\'") + '\')">' + t + '</a>';
      // Subtags (hidden initially)
      var subs = tags[t];
      if (subs && subs.length > 0) {
        html += '<div class="filter-sub-links" data-parent="' + t + '" style="display:none;">';
        subs.forEach(function(st) {
          html += '<a class="filter-sub-link" data-subtag="' + st + '" onclick="filterBySubtag(\'' + st.replace(/'/g, "\\'") + '\')">' + st + '</a>';
        });
        html += '</div>';
      }
    });
    container.innerHTML = html;
  } else if (Array.isArray(tags)) {
    var html = '<div class="filter-section-title">Department</div>';
    html += '<a class="filter-link active" onclick="filterByTag(\'\')">All Products</a>';
    tags.forEach(function(tag) {
      html += '<a class="filter-link" data-tag="' + tag + '" onclick="filterByTag(\'' + tag.replace(/'/g, "\\'") + '\')">' + tag + '</a>';
    });
    container.innerHTML = html;
  } else {
    container.style.display = "none";
  }
}

function filterByTag(tag) {
  activeTag = tag;
  activeSubtag = "";

  // Update active state on tag links
  document.querySelectorAll("#filterTags .filter-link").forEach(function(l) {
    l.classList.remove("active");
    if ((!tag && !l.getAttribute("data-tag")) || l.getAttribute("data-tag") === tag) {
      l.classList.add("active");
    }
  });

  // Show/hide subtags
  document.querySelectorAll("#filterTags .filter-sub-links").forEach(function(el) {
    el.style.display = (el.getAttribute("data-parent") === tag) ? "block" : "none";
  });
  // Reset subtag active
  document.querySelectorAll("#filterTags .filter-sub-link").forEach(function(l) { l.classList.remove("active"); });

  // Update breadcrumb
  var meta = CATEGORY_META[CATEGORY_KEY];
  var catLabel = meta ? meta.title.replace(/^[^\w]*/, "").trim() : CATEGORY_KEY;
  var breadcrumb = document.getElementById("breadcrumb");
  if (breadcrumb) {
    var bc = '<a href="/">Home</a> › <a href="/' + CATEGORY_KEY + '">' + catLabel + '</a>';
    if (tag) bc += ' › <span>' + tag + '</span>';
    breadcrumb.innerHTML = bc;
  }

  // If no tag selected, show sectioned view (all products grouped by tag)
  if (!tag) {
    renderSectionedView();
    return;
  }
  var filtered = allProducts.filter(function(p) { return p.tag === tag; });
  renderGrid(filtered);
  updateCount(filtered.length);
}

function filterBySubtag(subtag) {
  activeSubtag = subtag;

  // Update active state on subtag links
  document.querySelectorAll("#filterTags .filter-sub-link").forEach(function(l) {
    l.classList.remove("active");
    if (l.getAttribute("data-subtag") === subtag) l.classList.add("active");
  });

  // Update breadcrumb
  var meta = CATEGORY_META[CATEGORY_KEY];
  var catLabel = meta ? meta.title.replace(/^[^\w]*/, "").trim() : CATEGORY_KEY;
  var breadcrumb = document.getElementById("breadcrumb");
  if (breadcrumb) {
    var bc = '<a href="/">Home</a> › <a href="/' + CATEGORY_KEY + '">' + catLabel + '</a>';
    if (activeTag) bc += ' › <a onclick="filterByTag(\'' + activeTag.replace(/'/g, "\\'") + '\')" style="cursor:pointer;color:var(--accent);">' + activeTag + '</a>';
    if (subtag) bc += ' › <span>' + subtag + '</span>';
    breadcrumb.innerHTML = bc;
  }

  var filtered = allProducts.filter(function(p) {
    if (activeTag && p.tag !== activeTag) return false;
    if (subtag && p.subtag !== subtag) return false;
    return true;
  });
  renderGrid(filtered);
  updateCount(filtered.length);
}

function renderGrid(products) {
  var grid = document.getElementById("productGrid");
  // Reset grid display in case we were in sectioned view
  grid.style.display = "";
  grid.style.gridTemplateColumns = "";
  if (products.length === 0) { grid.innerHTML = '<p style="color:var(--text-light);padding:40px;text-align:center;grid-column:1/-1;">No products found for this filter.</p>'; return; }
  grid.innerHTML = products.map(function(p) { return renderProductCard(p, null, CATEGORY_KEY); }).join("");
}

function updateCount(n) { 
  var el = document.querySelector(".result-count"); 
  if (el) el.textContent = "Showing " + n + " products"; 
}

function updateTopRated(products) {
  var container = document.getElementById("topRated");
  if (!container) return;
  var top3 = products.slice().sort(function(a, b) { return b.rating - a.rating; }).slice(0, 3);
  container.innerHTML = top3.map(function(p, i) {
    return '<div class="top-product"><span class="top-rank">' + (i + 1) + '</span><div class="top-info"><div class="name">' + p.name + '</div><div class="mini-stars">' + (p.rating >= 4.5 ? "★★★★★" : "★★★★☆") + '</div><div class="price">$' + p.price.toFixed(2) + '</div></div></div>';
  }).join("");
}

function sortProducts(type, el) {
  document.querySelectorAll(".sort-link").forEach(function(l) { l.classList.remove("active"); });
  if (el) el.classList.add("active");
  var base = getFilteredBase();
  var sorted = base.slice();
  switch(type) {
    case "price-low": sorted.sort(function(a, b) { return a.price - b.price; }); break;
    case "price-high": sorted.sort(function(a, b) { return b.price - a.price; }); break;
    case "rating": sorted.sort(function(a, b) { return b.rating - a.rating; }); break;
    case "new": sorted = sorted.filter(function(p) { return p.badge === "New"; }).concat(sorted.filter(function(p) { return p.badge !== "New"; })); break;
  }
  renderGrid(sorted);
}

function getFilteredBase() {
  return allProducts.filter(function(p) {
    if (activeTag && p.tag !== activeTag) return false;
    if (activeSubtag && p.subtag !== activeSubtag) return false;
    return true;
  });
}

function applyFilters() {
  var f1 = document.getElementById("f1").checked, f2 = document.getElementById("f2").checked, f3 = document.getElementById("f3").checked, f4 = document.getElementById("f4").checked;
  var r1 = document.getElementById("r1").checked, r2 = document.getElementById("r2").checked;
  var anyPrice = f1 || f2 || f3 || f4, anyRating = r1 || r2, visible = 0;
  var base = getFilteredBase();
  var filtered = base.filter(function(p) {
    var show = true;
    if (anyPrice) { var ok = false; if (f1 && p.price < 10) ok = true; if (f2 && p.price >= 10 && p.price < 20) ok = true; if (f3 && p.price >= 20 && p.price < 30) ok = true; if (f4 && p.price >= 30) ok = true; if (!ok) show = false; }
    if (anyRating && show) { if (r1 && p.rating < 4.5) show = false; else if (r2 && !r1 && p.rating < 4.0) show = false; }
    if (show) visible++;
    return show;
  });
  renderGrid(filtered); updateCount(visible);
}

function filterCategoryProducts() {
  var query = document.getElementById("searchInput").value.toLowerCase().trim();
  var base = getFilteredBase();
  var filtered = base.filter(function(p) { return p.name.toLowerCase().includes(query) || !query; });
  renderGrid(filtered); updateCount(filtered.length);
}

document.addEventListener("DOMContentLoaded", initCategoryPage);
