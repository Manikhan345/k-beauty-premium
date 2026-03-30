export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "API key not configured" });

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
        system: "You are a JSON API. You ONLY output valid JSON arrays. Never output explanations, apologies, markdown, or any text that is not part of the JSON array. If you cannot find exact data, use your best estimates. Always respond with a JSON array starting with [ and ending with ]. No exceptions.",
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Search Amazon for ${num} best-selling ${category}${tag ? " " + tag : ""} products. Return JSON array only.

Format per product:
{"name":"product name","price":14.99,"originalPrice":null,"rating":4.7,"reviews":"12,000","image":"","url":"https://www.amazon.com/dp/EXAMPLE","bought":"10K+ bought in past month"}

Rules:
- Use real product names you find from searching
- Estimate prices based on typical Amazon prices if exact price not found
- Estimate ratings and review counts based on what you find
- Set image to empty string ""
- Set url to Amazon search URL if exact URL not found
- Set bought to "" if unknown
- originalPrice is null unless product is on sale
- DO NOT write anything except the JSON array`
        }]
      })
    });

    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });

    // Collect all text blocks
    let text = "";
    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text") text += block.text;
      }
    }

    // Aggressive cleanup
    text = text.trim();
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "");
    text = text.replace(/^[^[]*/, ""); // Remove everything before first [
    text = text.replace(/][^]]*$/, "]"); // Remove everything after last ]
    text = text.trim();

    if (!text.startsWith("[")) {
      // Last resort: try to find array
      const s = text.indexOf("[");
      const e = text.lastIndexOf("]");
      if (s !== -1 && e > s) {
        text = text.substring(s, e + 1);
      } else {
        return res.status(200).json({ products: [], error: "No JSON array found in response" });
      }
    }

    // Fix common JSON issues
    text = text.replace(/,\s*]/g, "]"); // Remove trailing commas
    text = text.replace(/'/g, '"'); // Replace single quotes

    const products = JSON.parse(text);
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(200).json({ products: [], error: "Empty results" });
    }

    return res.status(200).json({
      products: products.map(p => ({
        name: String(p.name || ""),
        price: parseFloat(p.price) || 0,
        originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
        rating: parseFloat(p.rating) || 4.5,
        reviews: String(p.reviews || "0"),
        image: String(p.image || ""),
        url: String(p.url || "#"),
        bought: String(p.bought || "")
      }))
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
