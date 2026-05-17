const fs = require("fs");
const path = require("path");

const BASE_URL = "https://kbeauty.fun";
const TODAY = new Date().toISOString().split("T")[0];

// Static category slugs — one per data file
const CATEGORY_SLUGS = {
  "skincare.json":   "skincare",
  "makeup.json":     "makeup",
  "haircare.json":   "haircare",
  "fragrance.json":  "fragrance",
  "foothand.json":   "foothand",
  "bathbody.json":   "bathbody",
  "serums.json":     "serums",
  "facemasks.json":  "facemasks",
};

// Static pages
const STATIC_PAGES = [
  { loc: "/",            changefreq: "daily",   priority: "1.0" },
  { loc: "/best-sellers",changefreq: "daily",   priority: "0.95" },
  { loc: "/blog",        changefreq: "weekly",  priority: "0.85" },
  { loc: "/about",       changefreq: "monthly", priority: "0.5" },
  { loc: "/contact",     changefreq: "monthly", priority: "0.6" },
  { loc: "/disclosure",  changefreq: "yearly",  priority: "0.3" },
  { loc: "/privacy",     changefreq: "yearly",  priority: "0.3" },
  { loc: "/terms",       changefreq: "yearly",  priority: "0.3" },
];

function url(loc, changefreq, priority) {
  return `  <url>\n    <loc>${BASE_URL}${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

const entries = [];

// 1. Static pages
STATIC_PAGES.forEach(p => entries.push(url(p.loc, p.changefreq, p.priority)));

// 2. Category pages
Object.values(CATEGORY_SLUGS).forEach(slug => {
  entries.push(url(`/${slug}`, "daily", "0.9"));
});

// 3. Blog posts
const blogPath = path.join(__dirname, "data", "blog.json");
if (fs.existsSync(blogPath)) {
  const posts = JSON.parse(fs.readFileSync(blogPath, "utf8"));
  posts
    .filter(p => p.status === "published")
    .forEach(p => {
      entries.push(url(`/blog/${p.slug}`, "monthly", "0.8"));
    });
}

// 4. Product pages — one entry per unique product ID per category
Object.entries(CATEGORY_SLUGS).forEach(([file, cat]) => {
  const filePath = path.join(__dirname, "data", file);
  if (!fs.existsSync(filePath)) return;

  const products = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const seen = new Set();

  products.forEach(p => {
    if (!p.id || seen.has(p.id)) return;
    seen.add(p.id);
    entries.push(url(`/p/${cat}/${p.id}`, "weekly", "0.7"));
  });
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

const outPath = path.join(__dirname, "sitemap.xml");
fs.writeFileSync(outPath, sitemap, "utf8");

const count = entries.length;
console.log(`✅ sitemap.xml generated — ${count} URLs`);
console.log(`   Static:     ${STATIC_PAGES.length}`);
console.log(`   Categories: ${Object.keys(CATEGORY_SLUGS).length}`);
