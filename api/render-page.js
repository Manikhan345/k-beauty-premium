// Vercel Edge Function — injects per-page meta tags server-side
// so Pinterest/Facebook/Instagram crawlers see correct OG image, title, description

export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const origin = url.origin;

  const blogMatch = pathname.match(/^\/blog\/([^\/]+)\/?$/);
  const productMatch = pathname.match(/^\/p\/([^\/]+)\/([^\/]+)\/?$/);

  try {
    if (blogMatch) {
      return await handleBlog(blogMatch[1], origin);
    } else if (productMatch) {
      return await handleProduct(productMatch[1], productMatch[2], origin);
    }
  } catch (e) {
    // On any error, fall back to original template so site never breaks
    return fallbackTemplate(origin, blogMatch ? 'blog-post.html' : 'product.html');
  }

  return new Response('Not found', { status: 404 });
}

async function handleBlog(slug, origin) {
  const [blogData, htmlTemplate] = await Promise.all([
    fetch(`${origin}/data/blog.json`).then(r => r.json()),
    fetch(`${origin}/blog-post.html`).then(r => r.text())
  ]);

  const post = blogData.find(p => p.slug === slug);
  if (!post) {
    return new Response(htmlTemplate, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }

  const html = injectBlogMeta(htmlTemplate, post, origin);
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
    }
  });
}

async function handleProduct(category, id, origin) {
  const [products, htmlTemplate] = await Promise.all([
    fetch(`${origin}/data/${category}.json`).then(r => r.json()),
    fetch(`${origin}/product.html`).then(r => r.text())
  ]);

  const product = products.find(p => p.id === id);
  if (!product) {
    return new Response(htmlTemplate, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }

  const html = injectProductMeta(htmlTemplate, product, category, origin);
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
    }
  });
}

function injectBlogMeta(html, post, origin) {
  const title = post.title + ' — K Beauty Premium';
  const description = post.excerpt || post.title;

  // Handle cover as object {url, position} OR string (backwards compat)
  let image = origin + '/header-banner.jpeg';
  if (post.cover) {
    if (typeof post.cover === 'string') image = post.cover;
    else if (post.cover.url) image = post.cover.url;
  }

  const canonicalUrl = origin + '/blog/' + post.slug;

  // Build article:tag entries from post.tags array
  let extra = '';
  if (Array.isArray(post.tags)) {
    extra += post.tags.map(t =>
      `<meta property="article:tag" content="${escapeAttr(t)}">`
    ).join('');
  }
  if (post.date) {
    extra += `<meta property="article:published_time" content="${escapeAttr(post.date)}">`;
  }

  return rebuildMeta(html, {
    title, description, image, url: canonicalUrl, type: 'article', extra
  });
}

function injectProductMeta(html, product, category, origin) {
  const title = product.name + ' — K Beauty Premium';

  const ratingStr = product.rating ? product.rating + ' stars' : '';
  const priceStr = (typeof product.price === 'number')
    ? '$' + product.price.toFixed(2)
    : '';
  let description = product.name + ' - Shop at K Beauty Premium.';
  if (ratingStr) description += ' ' + ratingStr;
  if (priceStr) description += ' from ' + priceStr;

  const image = product.image || (origin + '/header-banner.jpeg');
  const canonicalUrl = origin + '/p/' + category + '/' + product.id;

  return rebuildMeta(html, {
    title, description, image, url: canonicalUrl, type: 'product', extra: ''
  });
}

function rebuildMeta(html, m) {
  const t = escapeAttr(m.title);
  const d = escapeAttr(m.description);
  const i = escapeAttr(m.image);
  const u = escapeAttr(m.url);
  const type = escapeAttr(m.type);

  // 1) Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${t}</title>`);

  // 2) Strip any existing description/OG/Twitter/canonical tags (whether from source or none)
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
  html = html.replace(/<meta\s+property="og:[^"]+"[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]+"[^>]*>/gi, '');
  html = html.replace(/<link\s+rel="canonical"[^>]*>/gi, '');

  // 3) Inject fresh tags right before </head>
  const fresh = `<meta name="description" content="${d}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${i}">
<meta property="og:url" content="${u}">
<meta property="og:site_name" content="K Beauty Premium">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${i}">
<link rel="canonical" href="${u}">
${m.extra || ''}`;

  html = html.replace(/<\/head>/i, fresh + '</head>');

  return html;
}

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fallbackTemplate(origin, file) {
  const html = await fetch(`${origin}/${file}`).then(r => r.text()).catch(() => '');
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}
