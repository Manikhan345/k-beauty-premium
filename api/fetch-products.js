export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "API key not configured" });

  const AFFILIATE_TAG = "kbeauty000-20";

  try {
    const { category, tag, count } = req.body;
    const num = Math.min(count || 5, 10);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        system: "You are a JSON API. You ONLY output valid JSON arrays. Never output explanations, apologies, markdown, or any text outside the JSON array. Search Amazon product pages to find real product image URLs and ASINs. If you cannot find exact data, use your best knowledge to estimate. Always respond with a JSON array starting with [ and ending with ].",
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Search Amazon.com for ${num} top-rated, best-selling ${category}${tag ? " " + tag : ""} products. Visit the actual Amazon product pages to get image URLs and ASINs.

Return JSON array only. Each object must have:
{
  "name": "Full product name from Amazon listing",
  "price": 14.99,
  "originalPrice": null,
  "rating": 4.7,
  "reviews": "12,000",
  "image": "https://m.media-amazon.com/images/I/XXXXX.jpg",
  "asin": "B0XXXXXXXX",
  "bought": "10K+ bought in past month"
}

CRITICAL RULES:
- name: Use the real full Amazon product title
- price: Real current Amazon price as number
- originalPrice: Original price if discounted, otherwise null
- rating: Real Amazon star rating as number
- reviews: Real review count as string with commas
- image: MUST be a real Amazon image URL starting with https://m.media-amazon.com/images/I/ - find this from the product page
- asin: The 10-character Amazon ASIN (found in the product URL after /dp/)
- bought: The "X bought in past month" text from Amazon, or "" if not shown
- Output ONLY the JSON array, nothing else`
        }]
      })
    });

    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });

    let text = "";
    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text") text += block.text;
      }
    }

    // Aggressive cleanup
    text = text.trim();
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "");
    text = text.replace(/^[^[]*/, "");
    text = text.replace(/][^]]*$/, "]");
    text = text.trim();

    if (!text.startsWith("[")) {
      const s = text.indexOf("[");
      const e = text.lastIndexOf("]");
      if (s !== -1 && e > s) {
        text = text.substring(s, e + 1);
      } else {
        return res.status(200).json({ products: [], error: "No JSON array found" });
      }
    }

    text = text.replace(/,\s*]/g, "]");
    text = text.replace(/'/g, '"');

    const products = JSON.parse(text);

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(200).json({ products: [], error: "Empty results" });
    }

    return res.status(200).json({
      products: products.map(p => {
        const asin = String(p.asin || "").trim();
        const affiliateUrl = asin && asin.length === 10
          ? `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`
          : String(p.url || "#");

        return {
          name: String(p.name || ""),
          price: parseFloat(p.price) || 0,
          originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
          rating: parseFloat(p.rating) || 4.5,
          reviews: String(p.reviews || "0"),
          image: String(p.image || ""),
          url: affiliateUrl,
          bought: String(p.bought || "")
        };
      })
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
