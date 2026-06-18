export const config = { runtime: 'edge' };

const SITE = 'https://kbeauty.fun';
const CATEGORIES = ['skincare', 'makeup', 'haircare', 'fragrance', 'foothandnailcare', 'bathbody'];

const STATIC_PAGES = [
  { path: '/',            changefreq: 'daily',   priority: '1.0' },
  { path: '/best-sellers',changefreq: 'daily',   priority: '0.95' },
  { path: '/blog',        changefreq: 'daily',   priority: '0.9' },
  { path: '/about',       changefreq: 'monthly', priority: '0.5' },
  { path: '/contact',     changefreq: 'monthly', priority: '0.6' },
  { path: '/disclosure',  changefreq: 'yearly',  priority: '0.3' },
  { path: '/privacy',     changefreq: 'yearly',  priority: '0.3' },
  { path: '/terms',       changefreq: 'yearly',  priority: '0.3' },
];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function toArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  return [];
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}

function wrapUrlset(content) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + content + '</urlset>';
}

function xmlResponse(xml, maxage = 3600) {
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, s-maxage=${maxage}, stale-while-revalidate=86400`
    }
  });
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const today = new Date().toISOString().split('T')[0];

    if (pathname === '/sitemap.xml') {
      return buildIndex(today);
    }
    if (pathname === '/sitemap-pages.xml') {
      return buildPagesSitemap(today);
    }
    if (pathname === '/sitemap-blog.xml') {
      return await buildBlogSitemap(url.origin, today);
    }
    if (pathname === '/sitemap-products.xml') {
      return await buildProductsSitemap(url.origin, today);
    }

    return new Response('Not found', { status: 404 });
  } catch (err) {
    return new Response(`<!-- sitemap error: ${err.message} -->`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });
  }
}

function buildIndex(today) {
  const sitemaps = [
    SITE + '/sitemap-pages.xml',
    SITE + '/sitemap-blog.xml',
    SITE + '/sitemap-products.xml'
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const loc of sitemaps) {
    xml += `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  }
  xml += '</sitemapindex>';

  return xmlResponse(xml, 3600);
}

function buildPagesSitemap(today) {
  let content = '';
  for (const p of STATIC_PAGES) {
    content += urlEntry(SITE + p.path, today, p.changefreq, p.priority);
  }
  for (const cat of CATEGORIES) {
    content += urlEntry(`${SITE}/${cat}`, today, 'daily', '0.9');
  }
  return xmlResponse(wrapUrlset(content), 3600);
}

async function buildBlogSitemap(origin, today) {
  const res = await fetch(`${origin}/data/blog.json`, { cache: 'no-store' });
  const blog = res.ok ? await res.json() : null;
  const posts = toArray(blog, 'posts');

  let content = '';
  for (const post of posts) {
    if (!post.slug) continue;
    if (post.status && post.status !== 'published') continue;
    if (post.visibility && post.visibility !== 'public') continue;
    const lastmod = post.date ? String(post.date).split('T')[0] : today;
    // Blog priority 0.9 — higher than products, signals these are strategic content
    content += urlEntry(`${SITE}/blog/${esc(post.slug)}`, lastmod, 'daily', '0.95');
  }
  // Shorter cache for blog sitemap so new articles propagate faster
  return xmlResponse(wrapUrlset(content), 1800);
}

async function buildProductsSitemap(origin, today) {
  const results = await Promise.all(
    CATEGORIES.map(c => fetch(`${origin}/data/${c}.json`, { cache: 'no-store' }))
  );

  let content = '';
  for (let i = 0; i < CATEGORIES.length; i++) {
    if (!results[i].ok) continue;
    const data = await results[i].json();
    const products = toArray(data, 'products');
    for (const p of products) {
      if (!p.id) continue;
      content += urlEntry(`${SITE}/p/${CATEGORIES[i]}/${esc(p.id)}`, today, 'daily', '0.7');
    }
  }
  return xmlResponse(wrapUrlset(content), 3600);
}
