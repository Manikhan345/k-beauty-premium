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

export default async function handler(req) {
  try {
    const origin = new URL(req.url).origin;
    const today = new Date().toISOString().split('T')[0];

    const [blogRes, ...catResults] = await Promise.all([
      fetch(`${origin}/data/blog.json`, { cache: 'no-store' }),
      ...CATEGORIES.map(c => fetch(`${origin}/data/${c}.json`, { cache: 'no-store' }))
    ]);

    const blog = blogRes.ok ? await blogRes.json() : null;
    const catData = {};
    for (let i = 0; i < CATEGORIES.length; i++) {
      catData[CATEGORIES[i]] = catResults[i].ok ? await catResults[i].json() : null;
    }

    const urls = [];

    // Static pages
    for (const p of STATIC_PAGES) {
      urls.push({ loc: SITE + p.path, lastmod: today, changefreq: p.changefreq, priority: p.priority });
    }

    // Category pages
    for (const cat of CATEGORIES) {
      urls.push({ loc: `${SITE}/${cat}`, lastmod: today, changefreq: 'daily', priority: '0.9' });
    }

    // Blog posts
    const posts = toArray(blog, 'posts');
    for (const post of posts) {
      if (!post.slug) continue;
      if (post.status && post.status !== 'published') continue;
      if (post.visibility && post.visibility !== 'public') continue;
      const lastmod = post.date ? String(post.date).split('T')[0] : today;
      urls.push({ loc: `${SITE}/blog/${esc(post.slug)}`, lastmod, changefreq: 'monthly', priority: '0.8' });
    }

    // Product pages
    for (const cat of CATEGORIES) {
      const products = toArray(catData[cat], 'products');
      for (const p of products) {
        if (!p.id) continue;
        urls.push({ loc: `${SITE}/p/${cat}/${esc(p.id)}`, lastmod: today, changefreq: 'weekly', priority: '0.7' });
      }
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const u of urls) {
      xml += `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
    }
    xml += '</urlset>';

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (err) {
    return new Response(`<!-- sitemap error: ${err.message} -->`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });
  }
}
