/* ═══════════════════════════════════════════════════════════════
   K Beauty Premium — Category Page Logic
   ═══════════════════════════════════════════════════════════════ */
var allProducts = [];

async function initCategoryPage() {
  var meta = CATEGORY_META[CATEGORY_KEY];
  if (!meta) return;
  document.getElementById("catTitle").textContent = meta.title;
  document.title = meta.title.replace(/^[^\w]*/, "") + " — K Beauty Premium";
  allProducts = await fetchProducts(meta.file);
  renderGrid(allProducts);
  updateCount(allProducts.length);
  updateTopRated(allProducts);
}

function renderGrid(products) {
  var grid = document.getElementById("productGrid");
  if (products.length === 0) { grid.innerHTML = '<p style="color:var(--text-light);padding:40px;text-align:center;grid-column:1/-1;">No products found.</p>'; return; }
  grid.innerHTML = products.map(function(p) { return renderProductCard(p); }).join("");
}

function updateCount(n) { var el = document.querySelector(".result-count"); if (el) el.textContent = "Showing " + n + " products"; }

function updateTopRated(products) {
  var container = document.getElementById("topRated");
  if (!container) return;
  var top3 = products.slice().sort(function(a, b) { return b.rating - a.rating; }).slice(0, 3);
  container.innerHTML = top3.map(function(p, i) {
    return '<div class="top-product"><span class="top-rank">' + (i + 1) + '</span><div class="top-info"><div class="name">' + p.name + '</div><div class="mini-stars">' + (p.rating >= 4.5 ? "★★★★★" : "★★★★☆") + '</div><div class="price">$' + p.price.toFixed(2) + '</div></div></div>';
  }).join("");
}

function sortProducts(type, btn) {
  document.querySelectorAll(".sort-btn").forEach(function(b) { b.classList.remove("active"); });
  btn.classList.add("active");
  var sorted = allProducts.slice();
  switch(type) {
    case "price-low": sorted.sort(function(a, b) { return a.price - b.price; }); break;
    case "price-high": sorted.sort(function(a, b) { return b.price - a.price; }); break;
    case "rating": sorted.sort(function(a, b) { return b.rating - a.rating; }); break;
    case "new": sorted = sorted.filter(function(p) { return p.badge === "New"; }).concat(sorted.filter(function(p) { return p.badge !== "New"; })); break;
  }
  renderGrid(sorted);
}

function applyFilters() {
  var f1 = document.getElementById("f1").checked, f2 = document.getElementById("f2").checked, f3 = document.getElementById("f3").checked, f4 = document.getElementById("f4").checked;
  var r1 = document.getElementById("r1").checked, r2 = document.getElementById("r2").checked;
  var anyPrice = f1 || f2 || f3 || f4, anyRating = r1 || r2, visible = 0;
  var filtered = allProducts.filter(function(p) {
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
  var filtered = allProducts.filter(function(p) { return p.name.toLowerCase().includes(query) || !query; });
  renderGrid(filtered); updateCount(filtered.length);
}

document.addEventListener("DOMContentLoaded", initCategoryPage);
