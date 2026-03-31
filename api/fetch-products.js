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
        max_tokens: 2000,
        system: `You are a product data API. You output ONLY raw JSON arrays. No markdown. No backticks. No explanations. No apologies. Start your response with [ and end with ]. Nothing else.`,
        messages: [{
          role: "user",
          content: `[${num} products] Category: ${category}${tag ? ", Type: " + tag : ""}

Return the top ${num} best-selling Amazon products for this category. Use real product names, real ASINs, and real Amazon image URLs that you know from your training data.

JSON array format - each object:
{"name":"FULL Amazon product title","price":14.99,"originalPrice":null,"rating":4.7,"reviews":"12,000","image":"https://m.media-amazon.com/images/I/XXXXXXX.jpg","asin":"B0XXXXXXXX","bought":"10K+ bought in past month"}

Only output the JSON array. Start with [ end with ].`
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

    text = text.trim();
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    // Find the JSON array
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      text = text.substring(firstBracket, lastBracket + 1);
    }

    // Fix common issues
    text = text.replace(/,\s*]/g, "]");

    const products = JSON.parse(text);

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(200).json({ products: [], error: "No products found" });
    }

    return res.status(200).json({
      products: products.map(p => {
        const asin = String(p.asin || "").trim();
        const affiliateUrl = asin && asin.length >= 10
          ? `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`
          : "#";

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
    return res.status(500).json({ error: "Parse error: " + err.message });
  }
}
