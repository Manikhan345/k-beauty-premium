/* ═══════════════════════════════════════════════════════════════
   K Beauty Premium — Category Page Logic
   Reads CATEGORY_KEY from the page, fetches data, renders grid
   ═══════════════════════════════════════════════════════════════ */

let allProducts = [];

async function initCategoryPage() {
  const meta = CATEGORY_META[CATEGORY_KEY];
  if (!meta) return;

  // Set page title
  document.getElementById("catTitle").textContent = meta.title;
  document.title = meta.title.replace(/^[^\w]*/, "") + " — K Beauty Premium";

  // Fetch products
  allProducts = await fetchProducts(meta.file);

  // Render
  renderGrid(allProducts);
  updateCount(allProducts.length);
  updateTopRated(allProducts);
}

function renderGrid(products) {
  const grid = document.getElementById("productGrid");
  if (products.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-light);padding:40px;text-align:center;grid-column:1/-1;">No products found.</p>`;
    return;
  }
  grid.innerHTML = products.map(p => renderProductCard(p)).join("");
}

function updateCount(n) {
  const el = document.querySelector(".result-count");
  if (el) el.textContent = `Showing ${n} products`;
}

function updateTopRated(products) {
  const container = document.getElementById("topRated");
  if (!container) return;
  const top3 = [...products].sort((a, b) => b.rating - a.rating).slice(0, 3);
  container.innerHTML = top3.map((p, i) => `
    <div class="top-product">
      <span class="top-rank">${i + 1}</span>
      <div class="top-info">
        <div class="name">${p.name}</div>
        <div class="mini-stars">${p.rating >= 4.5 ? "★★★★★" : "★★★★☆"}</div>
        <div class="price">$${p.price.toFixed(2)}</div>
      </div>
    </div>
  `).join("");
}

// ── Sorting ──
function sortProducts(type, btn) {
  document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  let sorted = [...allProducts];
  switch(type) {
    case "price-low":  sorted.sort((a, b) => a.price - b.price); break;
    case "price-high": sorted.sort((a, b) => b.price - a.price); break;
    case "rating":     sorted.sort((a, b) => b.rating - a.rating); break;
    case "new":        sorted = sorted.filter(p => p.badge === "New").concat(sorted.filter(p => p.badge !== "New")); break;
    default:           break; // popular = original order
  }
  renderGrid(sorted);
}

// ── Filtering ──
function applyFilters() {
  const f1 = document.getElementById("f1").checked;
  const f2 = document.getElementById("f2").checked;
  const f3 = document.getElementById("f3").checked;
  const f4 = document.getElementById("f4").checked;
  const r1 = document.getElementById("r1").checked;
  const r2 = document.getElementById("r2").checked;

  const anyPrice = f1 || f2 || f3 || f4;
  const anyRating = r1 || r2;
  let visible = 0;

  const filtered = allProducts.filter(p => {
    let show = true;
    if (anyPrice) {
      let priceOk = false;
      if (f1 && p.price < 10) priceOk = true;
      if (f2 && p.price >= 10 && p.price < 20) priceOk = true;
      if (f3 && p.price >= 20 && p.price < 30) priceOk = true;
      if (f4 && p.price >= 30) priceOk = true;
      if (!priceOk) show = false;
    }
    if (anyRating && show) {
      if (r1 && p.rating < 4.5) show = false;
      else if (r2 && !r1 && p.rating < 4.0) show = false;
    }
    if (show) visible++;
    return show;
  });

  renderGrid(filtered);
  updateCount(visible);
}

// ── Search ──
function filterCategoryProducts() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query) || !query);
  renderGrid(filtered);
  updateCount(filtered.length);
}

// ── Init ──
document.addEventListener("DOMContentLoaded", initCategoryPage);
