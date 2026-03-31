export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const AFFILIATE_TAG = "kbeauty000-20";

  try {
    const { url } = req.body;
    if (!url || !url.includes("amazon.com")) {
      return res.status(400).json({ error: "Please provide a valid Amazon URL" });
    }

    // Fetch the Amazon page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
      }
    });

    if (!response.ok) {
      return res.status(400).json({ error: "Failed to fetch Amazon page. Status: " + response.status });
    }

    const html = await response.text();

    // Check if this is a search/category page or a single product page
    const isSearchPage = url.includes("/s?") || url.includes("/s/") || url.includes("&s=") || html.includes('data-component-type="s-search-result"');
    const isSingleProduct = url.includes("/dp/") || url.includes("/gp/product/");

    if (isSingleProduct) {
      // Single product page parsing
      const product = parseSingleProduct(html, url, AFFILIATE_TAG);
      return res.status(200).json({ products: [product], type: "single" });
    }

    // Search/Category page parsing
    const products = parseSearchPage(html, AFFILIATE_TAG);

    if (products.length === 0) {
      return res.status(200).json({ products: [], error: "No products found on this page. Amazon may have blocked the request. Try a different URL or try again later." });
    }

    return res.status(200).json({ products, type: "search" });

  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}

function parseSearchPage(html, affiliateTag) {
  const products = [];

  // Method 1: Parse search result blocks
  // Amazon wraps each product in data-asin attributes
  const asinPattern = /data-asin="([A-Z0-9]{10})"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
  
  // Better approach: split by search result divs
  const resultBlocks = html.split('data-component-type="s-search-result"');
  
  for (let i = 1; i < resultBlocks.length; i++) {
    const block = resultBlocks[i];
    
    // Extract ASIN
    let asin = "";
    const asinMatch = block.match(/data-asin="([A-Z0-9]{10})"/);
    if (asinMatch) asin = asinMatch[1];
    if (!asin) continue;

    // Extract product name
    let name = "";
    // Try multiple patterns for product title
    const namePatterns = [
      /class="a-size-medium a-color-base a-text-normal"[^>]*>([\s\S]*?)<\//,
      /class="a-size-base-plus a-color-base a-text-normal"[^>]*>([\s\S]*?)<\//,
      /class="a-size-mini a-spacing-none a-color-base s-line-clamp-[24]"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/,
      /class="a-link-normal s-underline-text[\s\S]*?"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/,
      /aria-label="([^"]{10,})"/,
    ];
    for (const pattern of namePatterns) {
      const match = block.match(pattern);
      if (match) {
        name = (match[1] || match[2] || "").replace(/<[^>]+>/g, "").trim();
        if (name.length > 10) break;
      }
    }
    if (!name || name.length < 5) continue;

    // Extract price
    let price = 0;
    let originalPrice = null;
    const pricePatterns = [
      /class="a-price"[^>]*>.*?class="a-offscreen"[^>]*>\$?([\d.]+)<\/span>/s,
      /class="a-price-whole">(\d+)<.*?class="a-price-fraction">(\d+)/s,
      /\$(\d+\.\d{2})/,
    ];
    for (const pattern of pricePatterns) {
      const match = block.match(pattern);
      if (match) {
        price = match[2] ? parseFloat(match[1] + "." + match[2]) : parseFloat(match[1]);
        if (price > 0) break;
      }
    }

    // Original price (strikethrough)
    const origMatch = block.match(/class="a-price a-text-price"[^>]*>.*?class="a-offscreen"[^>]*>\$?([\d.]+)<\/span>/s);
    if (origMatch) {
      const op = parseFloat(origMatch[1]);
      if (op > price) originalPrice = op;
    }

    // Extract rating
    let rating = 0;
    const ratingMatch = block.match(/class="a-icon-alt"[^>]*>(\d+\.?\d*)\s*out of/);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);
    if (!rating) {
      const ratingMatch2 = block.match(/(\d+\.?\d*)\s*out of\s*5/);
      if (ratingMatch2) rating = parseFloat(ratingMatch2[1]);
    }

    // Extract review count
    let reviews = "0";
    const reviewPatterns = [
      /aria-label="[\d,.]+\s*out of 5 stars"[\s\S]*?<span[^>]*class="a-size-base[^"]*"[^>]*>([\d,]+)<\/span>/,
      /class="a-size-base s-underline-text">([\d,]+)<\/span>/,
      />([\d,]{3,})<\/span>\s*<\/a>/,
    ];
    for (const pattern of reviewPatterns) {
      const match = block.match(pattern);
      if (match) {
        reviews = match[1].trim();
        if (reviews.length >= 2) break;
      }
    }

    // Extract image
    let image = "";
    const imgPatterns = [
      /class="s-image"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg)"/,
      /data-image-latency="s-product-image"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    ];
    for (const pattern of imgPatterns) {
      const match = block.match(pattern);
      if (match) {
        image = match[1];
        break;
      }
    }

    // Extract bought in past month
    let bought = "";
    const boughtMatch = block.match(/(\d+K?\+?\s*bought\s+in\s+past\s+month)/i);
    if (boughtMatch) bought = boughtMatch[1];

    // Build affiliate URL
    const affiliateUrl = `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}`;

    // Skip sponsored/ad results with no real data
    if (price === 0 && rating === 0) continue;

    products.push({
      name,
      price,
      originalPrice,
      rating: rating || 4.5,
      reviews,
      image,
      url: affiliateUrl,
      asin,
      bought,
      prime: true
    });
  }

  return products;
}

function parseSingleProduct(html, originalUrl, affiliateTag) {
  // Extract ASIN
  let asin = "";
  const dpMatch = originalUrl.match(/\/dp\/([A-Z0-9]{10})/);
  const gpMatch = originalUrl.match(/\/gp\/product\/([A-Z0-9]{10})/);
  if (dpMatch) asin = dpMatch[1];
  else if (gpMatch) asin = gpMatch[1];

  // Name
  let name = "";
  const titleMatch = html.match(/<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/);
  if (titleMatch) name = titleMatch[1].trim();

  // Price
  let price = 0;
  let originalPrice = null;
  const pricePatterns = [
    /class="a-price-whole">(\d+)<.*?class="a-price-fraction">(\d+)/s,
    /\$(\d+\.\d{2})/
  ];
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match) {
      price = match[2] ? parseFloat(match[1] + "." + match[2]) : parseFloat(match[1]);
      if (price > 0) break;
    }
  }

  // Rating
  let rating = 0;
  const ratingMatch = html.match(/(\d+\.?\d*)\s*out of\s*5/);
  if (ratingMatch) rating = parseFloat(ratingMatch[1]);

  // Reviews
  let reviews = "0";
  const reviewMatch = html.match(/(\d[\d,]+)\s*(?:global\s+)?ratings/i);
  if (reviewMatch) reviews = reviewMatch[1];

  // Image
  let image = "";
  const imgPatterns = [
    /"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /id="landingImage"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
  ];
  for (const pattern of imgPatterns) {
    const match = html.match(pattern);
    if (match) { image = match[1]; break; }
  }

  // Bought
  let bought = "";
  const boughtMatch = html.match(/(\d+K?\+?\s*bought\s+in\s+past\s+month)/i);
  if (boughtMatch) bought = boughtMatch[1];

  const affiliateUrl = asin
    ? `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}`
    : originalUrl;

  return {
    name: name || "Product name not found",
    price,
    originalPrice,
    rating: rating || 4.5,
    reviews,
    image,
    url: affiliateUrl,
    asin,
    bought,
    prime: true
  };
}
