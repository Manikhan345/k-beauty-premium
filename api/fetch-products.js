export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { url } = req.body;
    if (!url || !url.includes("amazon.com")) {
      return res.status(400).json({ error: "Please provide a valid Amazon URL" });
    }

    const AFFILIATE_TAG = "kbeauty000-20";

    // Extract ASIN from URL
    let asin = "";
    const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/);
    if (dpMatch) asin = dpMatch[1];
    else if (gpMatch) asin = gpMatch[1];

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

    // Parse product name
    let name = "";
    const titleMatch = html.match(/<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/);
    if (titleMatch) name = titleMatch[1].trim();
    if (!name) {
      const titleMatch2 = html.match(/<title>([\s\S]*?)<\/title>/);
      if (titleMatch2) name = titleMatch2[1].replace(/Amazon\.com\s*[:|-]\s*/, "").replace(/\s*[-|:]\s*.*$/, "").trim();
    }

    // Parse price
    let price = 0;
    let originalPrice = null;
    // Try different price selectors
    const pricePatterns = [
      /class="a-price-whole">(\d+)<.*?class="a-price-fraction">(\d+)/s,
      /priceAmount['"]:?\s*(\d+\.?\d*)/,
      /"price":\s*"?(\d+\.?\d*)"?/,
      /\$(\d+\.\d{2})/
    ];
    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        if (match[2]) {
          price = parseFloat(match[1] + "." + match[2]);
        } else {
          price = parseFloat(match[1]);
        }
        if (price > 0) break;
      }
    }

    // Try to find original/list price
    const origPriceMatch = html.match(/class="a-price a-text-price"[^>]*>.*?<span[^>]*>\$?([\d.]+)<\/span>/s);
    if (origPriceMatch) {
      const op = parseFloat(origPriceMatch[1]);
      if (op > price) originalPrice = op;
    }

    // Parse rating
    let rating = 0;
    const ratingMatch = html.match(/(\d+\.?\d*)\s*out of\s*5/);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);
    if (!rating) {
      const ratingMatch2 = html.match(/"ratingValue":\s*"?(\d+\.?\d*)"?/);
      if (ratingMatch2) rating = parseFloat(ratingMatch2[1]);
    }

    // Parse review count
    let reviews = "0";
    const reviewMatch = html.match(/(\d[\d,]+)\s*(?:global\s+)?ratings/i);
    if (reviewMatch) reviews = reviewMatch[1];
    if (reviews === "0") {
      const reviewMatch2 = html.match(/"reviewCount":\s*"?(\d[\d,]*)"?/);
      if (reviewMatch2) reviews = reviewMatch2[1];
    }

    // Parse image
    let image = "";
    const imgPatterns = [
      /"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /id="landingImage"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /id="imgBlkFront"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\._(?:AC_SL1500|AC_SL1200|AC_SL1000|AC_SX679|AC_SY741|AC_SX569|AC_SX355|AC_UL1500|SL1500|SL1200|SL1000)[^"]*\.jpg)"/
    ];
    for (const pattern of imgPatterns) {
      const match = html.match(pattern);
      if (match) {
        image = match[1];
        break;
      }
    }
    // Fallback: any Amazon image
    if (!image) {
      const anyImg = html.match(/"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg)"/);
      if (anyImg) image = anyImg[1];
    }

    // Parse bought in past month
    let bought = "";
    const boughtMatch = html.match(/(\d+K?\+?\s*bought\s+in\s+past\s+month)/i);
    if (boughtMatch) bought = boughtMatch[1];

    // Build affiliate URL
    const affiliateUrl = asin
      ? `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`
      : url.includes("tag=") ? url : url + (url.includes("?") ? "&" : "?") + `tag=${AFFILIATE_TAG}`;

    return res.status(200).json({
      product: {
        name: name || "Product name not found",
        price: price,
        originalPrice: originalPrice,
        rating: rating || 4.5,
        reviews: reviews,
        image: image,
        url: affiliateUrl,
        asin: asin,
        bought: bought,
        prime: true
      }
    });

  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch: " + err.message });
  }
}
