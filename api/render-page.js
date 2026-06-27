// Vercel Edge Function — meta tags + body SSR for blog posts; meta-only for products/categories

export const config = {
  runtime: 'edge'
};

const CATEGORY_SEO = {
  'skincare': {
    title: 'Best Korean Skincare on Amazon — K Beauty Premium',
    description: 'Shop top-rated Korean skincare on Amazon: cleansers, serums, moisturizers, toners, sunscreens, masks, and more from leading K-beauty brands.'
  },
  'makeup': {
    title: 'Best Korean Makeup on Amazon — K Beauty Premium',
    description: 'Shop top-rated Korean makeup on Amazon: lip tints, cushion foundations, BB creams, eyeshadows, blushes, and more from top K-beauty brands.'
  },
  'haircare': {
    title: 'Best Korean Hair Care on Amazon — K Beauty Premium',
    description: 'Top Korean hair care on Amazon: shampoos, conditioners, treatments, hair masks, oils, and scalp care from leading K-beauty brands.'
  },
  'fragrance': {
    title: 'Best Korean Fragrances & Home Scents on Amazon — K Beauty Premium',
    description: 'Discover Korean perfumes, body mists, candles, and home scents on Amazon — curated picks from K-beauty\'s favorite fragrance brands.'
  },
  'foothandnailcare': {
    title: 'Best Korean Foot, Hand & Nail Care on Amazon — K Beauty Premium',
    description: 'Korean foot peels, hand creams, nail treatments, and care products on Amazon — top-rated picks from K-beauty brands.'
  },
  'bathbody': {
    title: 'Best Korean Bath & Body Care on Amazon — K Beauty Premium',
    description: 'Korean body washes, scrubs, bath oils, deodorants, and body care on Amazon — gentle, hydrating picks from top K-beauty brands.'
  }
};

export default async function handler(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const origin = url.origin;

 const blogMatch = pathname.match(/^\/blog\/([^\/]+)\/?$/);
  const productMatch = pathname.match(/^\/p\/([^\/]+)\/([^\/]+)\/?$/);
  const categoryMatch = pathname.match(/^\/(skincare|makeup|haircare|fragrance|foothandnailcare|bathbody)\/?$/);
  const homeMatch = pathname === '/' || pathname === '';
  const routineMatch = pathname.match(/^\/routines\/([^\/]+)\/?$/);
  const routinesListingMatch = pathname === '/routines' || pathname === '/routines/';

  try {
    if (homeMatch) {
      return await handleHomepage(origin);
    } else if (routineMatch) {
      return await handleRoutine(routineMatch[1], origin);
    } else if (routinesListingMatch) {
      return await handleRoutinesListing(origin);
    } else if (blogMatch) {
      return await handleBlog(blogMatch[1], origin);
    } else if (productMatch) {
      return await handleProduct(productMatch[1], productMatch[2], origin);
    } else if (categoryMatch) {
      return await handleCategory(categoryMatch[1], origin);
    }
  } catch (e) {
    let fallbackFile = 'index.html';
    if (routineMatch) fallbackFile = 'routine.html';
    else if (routinesListingMatch) fallbackFile = 'routines.html';
    else if (blogMatch) fallbackFile = 'blog-post.html';
    else if (categoryMatch) fallbackFile = 'category.html';
    else if (productMatch) fallbackFile = 'product.html';
    return fallbackTemplate(origin, fallbackFile);
  }

  return new Response('Not found', { status: 404 });
}

async function handleBlog(slug, origin) {
  const [blogData, htmlTemplate] = await Promise.all([
    fetch(`${origin}/data/blog.json`).then(r => r.json()),
    fetch(`${origin}/blog-post.html`).then(r => r.text())
  ]);

  // Sort newest-first (matches client-side prev/next behavior)
  const posts = blogData.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  const post = posts.find(p => p.slug === slug);
  if (!post || post.status === 'draft') {
    return new Response(htmlTemplate, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }

  let html = injectBlogMeta(htmlTemplate, post, origin);
  html = injectBlogBody(html, post, posts);
  html = injectBlogSchema(html, post);

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

async function handleCategory(catSlug, origin) {
  const htmlTemplate = await fetch(`${origin}/category.html`).then(r => r.text());
  const seo = CATEGORY_SEO[catSlug] || {
    title: catSlug + ' — K Beauty Premium',
    description: 'Shop Korean beauty products on Amazon — curated picks at K Beauty Premium.'
  };

  const canonicalUrl = origin + '/' + catSlug;
  const image = origin + '/header-banner.jpeg';

  const html = rebuildMeta(htmlTemplate, {
    title: seo.title,
    description: seo.description,
    image: image,
    url: canonicalUrl,
    type: 'website',
    extra: ''
  });

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400'
    }
  });
}

function injectBlogMeta(html, post, origin) {
  const title = post.title;
  const description = post.excerpt || post.title;

  let image = origin + '/header-banner.jpeg';
  if (post.cover) {
    if (typeof post.cover === 'string') image = post.cover;
    else if (post.cover.url) image = post.cover.url;
  }

  const canonicalUrl = origin + '/blog/' + post.slug;

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
  const title = product.name;

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

function injectBlogBody(html, post, posts) {
  const bodyHTML = renderBlogBody(post, posts);

  html = html.replace(
    '<div class="post-container" id="postContainer">',
    '<div class="post-container" id="postContainer" data-ssr="true">'
  );

  html = html.replace(
    '<div class="post-loading">Loading post...</div>',
    bodyHTML
  );

  return html;
}

function injectBlogSchema(html, post) {
  let image = '';
  if (typeof post.cover === 'string') image = post.cover;
  else if (post.cover && post.cover.url) image = post.cover.url;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt || '',
    "image": image,
    "datePublished": post.date,
    "author": { "@type": "Organization", "name": "K Beauty Premium" },
    "publisher": { "@type": "Organization", "name": "K Beauty Premium" }
  };

  // Escape < to prevent premature </script> closure inside JSON-LD
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  const tag = `<script type="application/ld+json">${json}</script>`;

  return html.replace('</head>', tag + '</head>');
}

function renderBlogBody(post, posts) {
  const titleEsc = escapeAttr(post.title);

  const dateStr = post.date
    ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const tagsHTML = (post.tags || [])
    .map(t => `<span class="post-tag">${escapeAttr(t)}</span>`)
    .join('');

  let coverUrl = '';
  if (typeof post.cover === 'string') coverUrl = post.cover;
  else if (post.cover && post.cover.url) coverUrl = post.cover.url;
  const coverHTML = coverUrl
    ? `<img src="${escapeAttr(coverUrl)}" alt="${titleEsc}" class="post-cover">`
    : '';

  const contentHTML = markdownToHTML(post.content || '');

  const idx = posts.findIndex(p => p.slug === post.slug);
  const prev = idx < posts.length - 1 ? posts[idx + 1] : null;
  const next = idx > 0 ? posts[idx - 1] : null;
  let navHTML = '<div class="post-nav">';
  navHTML += prev
    ? `<a href="/blog/${prev.slug}">← ${escapeAttr(prev.title.substring(0, 40))}...</a>`
    : '<span></span>';
  navHTML += next
    ? `<a href="/blog/${next.slug}">${escapeAttr(next.title.substring(0, 40))}... →</a>`
    : '<span></span>';
  navHTML += '</div>';

  const breadcrumbTitle = escapeAttr(post.title.substring(0, 50));

  return (
    `<div class="post-breadcrumb"><a href="/">Home</a> › <a href="/blog">Blog</a> › <span>${breadcrumbTitle}...</span></div>` +
    `<div class="post-date">${escapeAttr(dateStr)}</div>` +
    `<h1 class="post-title">${titleEsc}</h1>` +
    (tagsHTML ? `<div class="post-tags">${tagsHTML}</div>` : '') +
    coverHTML +
    `<div class="post-content">${contentHTML}</div>` +
    navHTML
  );
}

// Mirror of markdownToHTML in /blog-post.html — keep in sync if you change one
function markdownToHTML(md) {
  let html = md;

  // TikTok embeds
  html = html.replace(/(?:^|\n)(https?:\/\/(?:www\.)?tiktok\.com\/@[^\/]+\/video\/(\d+)[^\s]*)/gm, function(match, url, videoId) {
    return '<div style="max-width:325px;margin:16px auto;"><iframe src="https://www.tiktok.com/player/v1/' + videoId + '?music_info=0&description=0" style="width:100%;height:580px;border:none;border-radius:12px;" allowfullscreen allow="encrypted-media"></iframe></div>';
  });

  // Tables
  html = html.replace(/(?:^|\n)((?:\|[^\n]+\|\n?)+)/gm, function(match, tableBlock) {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return match;

    const parseRow = (row) =>
      row.split('|').filter((c, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());

    const hasSeparator = /^\|[\s\-:]+\|/.test(rows[1]);
    const headerCells = parseRow(rows[0]);
    const startIdx = hasSeparator ? 2 : 1;

    let tableHTML = '<div class="table-responsive"><table><thead><tr>';
    headerCells.forEach(cell => { tableHTML += '<th>' + cell + '</th>'; });
    tableHTML += '</tr></thead><tbody>';

    for (let i = startIdx; i < rows.length; i++) {
      const cells = parseRow(rows[i]);
      if (cells.length === 0) continue;
      const isTotal = cells.join('').toLowerCase().indexOf('total') !== -1;
      tableHTML += '<tr' + (isTotal ? ' class="table-total"' : '') + '>';
      cells.forEach(cell => {
        cell = cell.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        cell = cell.replace(/\*(.+?)\*/g, '<em>$1</em>');
        tableHTML += '<td>' + cell + '</td>';
      });
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table></div>';
    return tableHTML;
  });

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Bold/italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Blockquote
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // HR
  html = html.replace(/^---+$/gm, '<hr>');

  // Paragraphs
  const blocks = html.split(/\n{2,}|\n(?=<h[2-4])|(?<=<\/h[2-4]>)\n/);
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') || block.startsWith('<blockquote') || block.startsWith('<hr') || block.startsWith('<img') || block.startsWith('<div') || block.startsWith('<table')) return block;
    if (!block.startsWith('<')) return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
    return block;
  }).join('\n');

  return html;
}

function rebuildMeta(html, m) {
  const t = escapeAttr(m.title);
  const d = escapeAttr(m.description);
  const i = escapeAttr(m.image);
  const u = escapeAttr(m.url);
  const type = escapeAttr(m.type);

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${t}</title>`);

  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
  html = html.replace(/<meta\s+property="og:[^"]+"[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]+"[^>]*>/gi, '');
  html = html.replace(/<link\s+rel="canonical"[^>]*>/gi, '');

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

async function handleHomepage(origin) {
  const [blogData, htmlTemplate] = await Promise.all([
    fetch(`${origin}/data/blog.json`).then(r => r.json()),
    fetch(`${origin}/index.html`).then(r => r.text())
  ]);

  const posts = blogData
    .filter(p => p.status === 'published')
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 6);

  const guidesHTML = posts.map(p => {
    let coverUrl = '';
    let coverPos = 'center';
    if (typeof p.cover === 'string') {
      coverUrl = p.cover;
    } else if (p.cover && p.cover.url) {
      coverUrl = p.cover.url;
      if (p.cover.position) coverPos = p.cover.position;
    }
    const safeTitle = escapeAttr(p.title || 'Blog post');
    const img = coverUrl
      ? `<img src="${escapeAttr(coverUrl)}" alt="${safeTitle}" loading="lazy" style="object-position:center ${escapeAttr(coverPos)};">`
      : '<div class="guide-card-img-empty">📝</div>';
    let excerpt = p.excerpt || '';
    if (excerpt.length > 80) excerpt = excerpt.substring(0, 80).trim() + '...';
    return `<a href="/blog/${escapeAttr(p.slug)}" class="guide-card">` +
      `<div class="guide-card-img-wrap">${img}</div>` +
      `<div class="guide-card-content">` +
        `<div class="guide-card-title">${escapeAttr(p.title || 'Untitled')}</div>` +
        `<div class="guide-card-excerpt">${escapeAttr(excerpt)}</div>` +
      `</div>` +
    `</a>`;
  }).join('');

  let html = htmlTemplate.replace(
    '<section class="popular-guides" id="popularGuidesSection" style="display:none;">',
    '<section class="popular-guides" id="popularGuidesSection" data-ssr="true">'
  );

  html = html.replace(
    '<div class="popular-guides-grid" id="popularGuidesGrid"></div>',
    `<div class="popular-guides-grid" id="popularGuidesGrid">${guidesHTML}</div>`
  );

  // Also inject routines preview
  try {
    const routinesData = await fetch(`${origin}/data/routines.json`).then(r => r.json());
    const topRoutines = routinesData
      .filter(r => r.status !== 'draft' && r.visibility !== 'private')
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 3);

    if (topRoutines.length > 0) {
      const routinesHTML = topRoutines.map(r => {
        let coverUrl = '';
        let coverPos = 'center';
        if (typeof r.cover === 'string') {
          coverUrl = r.cover;
        } else if (r.cover && r.cover.url) {
          coverUrl = r.cover.url;
          if (r.cover.position) coverPos = r.cover.position;
        }
        const safeTitle = escapeAttr(r.title || 'Routine');
        const img = coverUrl
          ? `<div class="routine-mini-img"><img src="${escapeAttr(coverUrl)}" alt="${safeTitle}" loading="lazy" style="object-position:center ${escapeAttr(coverPos)};"></div>`
          : '<div class="routine-mini-img"><div class="routine-mini-img-empty">✨</div></div>';
        const pills = '<div class="routine-mini-pills">' +
          (r.skinType ? `<span class="routine-mini-pill skin">${escapeAttr(r.skinType)} skin</span>` : '') +
          (r.timeOfDay ? `<span class="routine-mini-pill time">${escapeAttr(r.timeOfDay)}</span>` : '') +
        '</div>';
        return `<a href="/routines/${escapeAttr(r.slug)}" class="routine-mini-card">${img}<div class="routine-mini-content">${pills}<div class="routine-mini-title">${escapeAttr(r.title || 'Untitled')}</div></div></a>`;
      }).join('');

      html = html.replace(
        '<section class="routines-preview" id="routinesPreviewSection" style="display:none;">',
        '<section class="routines-preview" id="routinesPreviewSection" data-ssr="true">'
      );
      html = html.replace(
        '<div class="routines-preview-grid" id="routinesPreviewGrid"></div>',
        `<div class="routines-preview-grid" id="routinesPreviewGrid">${routinesHTML}</div>`
      );
    }
  } catch(e) {
    // Routines section silently omitted if JSON fails — homepage still works
  }

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
    }
  });
}

async function handleRoutinesListing(origin) {
  const [routinesData, htmlTemplate] = await Promise.all([
    fetch(`${origin}/data/routines.json`).then(r => r.json()),
    fetch(`${origin}/routines.html`).then(r => r.text())
  ]);

  const routines = routinesData
    .filter(r => r.status !== 'draft' && r.visibility !== 'private')
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const cardsHTML = routines.map(r => {
    let coverUrl = '';
    let coverPos = 'center';
    if (typeof r.cover === 'string') {
      coverUrl = r.cover;
    } else if (r.cover && r.cover.url) {
      coverUrl = r.cover.url;
      if (r.cover.position) coverPos = r.cover.position;
    }
    const safeTitle = escapeAttr(r.title || 'Routine');
    const cover = coverUrl
      ? `<div class="routine-card-img-wrap"><img src="${escapeAttr(coverUrl)}" alt="${safeTitle}" loading="lazy" style="object-position:center ${escapeAttr(coverPos)};"></div>`
      : '<div class="routine-card-img-wrap"><div class="routine-card-img-empty">✨</div></div>';

    const pills = '<div class="routine-card-pills">' +
      (r.skinType ? `<span class="routine-pill skin">${escapeAttr(r.skinType)} skin</span>` : '') +
      (r.timeOfDay ? `<span class="routine-pill time">${escapeAttr(r.timeOfDay)}</span>` : '') +
      (r.stepCount ? `<span class="routine-pill meta">${escapeAttr(r.stepCount)} steps</span>` : '') +
      (r.duration ? `<span class="routine-pill meta">${escapeAttr(r.duration)}</span>` : '') +
    '</div>';

    return `<a href="/routines/${escapeAttr(r.slug)}" class="routine-card">${cover}<div class="routine-card-content">${pills}<div class="routine-card-title">${escapeAttr(r.title || 'Untitled')}</div><div class="routine-card-excerpt">${escapeAttr(r.excerpt || '')}</div><div class="routine-card-cta">View routine →</div></div></a>`;
  }).join('');

  const finalCards = cardsHTML ||
    '<div class="routines-empty"><h3>Coming Soon</h3><p>We are building Korean skincare routines for every skin type. Check back soon.</p></div>';

  let html = htmlTemplate.replace(
    '<div class="routines-grid" id="routinesGrid">',
    '<div class="routines-grid" id="routinesGrid" data-ssr="true">'
  );

  html = html.replace(
    '<div class="routines-loading">Loading routines...</div>',
    finalCards
  );

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
    }
  });
}

async function handleRoutine(slug, origin) {
  const [routinesData, htmlTemplate] = await Promise.all([
    fetch(`${origin}/data/routines.json`).then(r => r.json()),
    fetch(`${origin}/routine.html`).then(r => r.text())
  ]);

  const routine = routinesData.find(r => r.slug === slug);
  if (!routine || routine.status === 'draft') {
    return new Response(htmlTemplate, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }

  const title = routine.title;
  const description = routine.excerpt || routine.title;
  let image = origin + '/header-banner.jpeg';
  if (typeof routine.cover === 'string') image = routine.cover;
  else if (routine.cover && routine.cover.url) image = routine.cover.url;
  const canonicalUrl = origin + '/routines/' + routine.slug;

  let html = rebuildMeta(htmlTemplate, {
    title, description, image, url: canonicalUrl, type: 'article', extra: ''
  });

  // Build the routine body HTML
  const bodyHTML = renderRoutineBody(routine);

  html = html.replace(
    '<div class="routine-container" id="routineContainer">',
    '<div class="routine-container" id="routineContainer" data-ssr="true">'
  );

  html = html.replace(
    '<div class="routine-loading">Loading routine...</div>',
    bodyHTML
  );

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
    }
  });
}

function renderRoutineBody(r) {
  let coverUrl = '';
  if (typeof r.cover === 'string') coverUrl = r.cover;
  else if (r.cover && r.cover.url) coverUrl = r.cover.url;

  const heroImg = coverUrl
    ? `<div class="routine-hero-img"><img src="${escapeAttr(coverUrl)}" alt="${escapeAttr(r.title)}"></div>`
    : '';

  const pills = '<div class="routine-hero-pills">' +
    (r.skinType ? `<span class="routine-pill skin">${escapeAttr(r.skinType)} skin</span>` : '') +
    (r.timeOfDay ? `<span class="routine-pill time">${escapeAttr(r.timeOfDay)}</span>` : '') +
    (r.stepCount ? `<span class="routine-pill meta">${escapeAttr(r.stepCount)} steps</span>` : '') +
    (r.duration ? `<span class="routine-pill meta">${escapeAttr(r.duration)}</span>` : '') +
  '</div>';

  const slidesHTML = (r.steps || []).map(s => {
    const imgHTML = s.productImage
      ? `<img src="${escapeAttr(s.productImage)}" alt="${escapeAttr(s.productName)}" loading="lazy">`
      : '<div class="step-slide-img-empty">[product]</div>';
    const tipHTML = s.tip ? `<div class="step-slide-tip"><strong>Tip</strong>${escapeAttr(s.tip)}</div>` : '';
    const waitNum = parseInt(s.waitTime) || 0;
    const waitHTML = waitNum > 0
      ? `<div class="step-slide-wait">Wait <strong>${escapeAttr(s.waitTime)} min</strong> before next step</div>`
      : '<div class="step-slide-wait">Continue immediately</div>';
    const btnHTML = s.productUrl
      ? `<a href="${escapeAttr(s.productUrl)}" target="_blank" rel="nofollow noopener" class="step-slide-amazon">View on Amazon</a>`
      : '';
    return `<div class="step-slide"><div class="step-slide-img-wrap">${imgHTML}</div><div class="step-slide-content"><div class="step-slide-label">STEP ${escapeAttr(s.stepNumber)} - ${escapeAttr(s.title)}</div><h2 class="step-slide-title">${escapeAttr(s.productName)}</h2><div class="step-slide-why">${escapeAttr(s.whyThisStep)}</div>${tipHTML}${waitHTML}${btnHTML}</div></div>`;
  }).join('');

  const outroHTML = r.outro
    ? `<div class="routine-outro"><h3>The Bottom Line</h3><p>${escapeAttr(r.outro)}</p></div>`
    : '';

  let sourcesHTML = '';
  if (r.sources && r.sources.trim()) {
    const lines = r.sources.split(/\n/).map(l => l.trim()).filter(Boolean);
    const items = lines.map(line => {
      const urlMatch = line.match(/(https?:\/\/\S+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const label = line.replace(url, "").replace(/[\s:-]+$/, "").trim() || url;
        return `<li><a href="${escapeAttr(url)}" target="_blank" rel="noopener nofollow">${escapeAttr(label)}</a></li>`;
      }
      return `<li>${escapeAttr(line)}</li>`;
    }).join("");
    sourcesHTML = `<div class="routine-sources"><h3>Sources &amp; References</h3><ul>${items}</ul><p class="routine-disclaimer"><strong>Not medical advice.</strong> General skincare guidance for educational purposes. Patch test new products. Consult a dermatologist for persistent concerns or specific conditions.</p></div>`;
  }

  return `<div class="routine-breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/routines">Routines</a> &rsaquo; <span>${escapeAttr(r.title)}</span></div><div class="routine-hero">${heroImg}<div class="routine-hero-content">${pills}<h1>${escapeAttr(r.title)}</h1>${r.intro ? `<div class="routine-intro">${escapeAttr(r.intro)}</div>` : ''}</div></div><div class="routine-slider-section"><div class="routine-slider-heading">The Routine, Step by Step</div><div class="routine-slider-viewport"><div class="routine-slider-track" id="routineSliderTrack">${slidesHTML}</div></div><div class="routine-slider-controls"><button class="routine-arrow" id="routinePrev" aria-label="Previous step">&larr;</button><div class="routine-dots" id="routineDots"></div><span class="routine-step-counter" id="routineCounter"></span><button class="routine-arrow" id="routineNext" aria-label="Next step">&rarr;</button></div></div>${outroHTML}${sourcesHTML}`;
}
async function fallbackTemplate(origin, file) {
  const html = await fetch(`${origin}/${file}`).then(r => r.text()).catch(() => '');
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}
