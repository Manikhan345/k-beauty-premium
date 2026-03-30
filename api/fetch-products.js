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
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Find ${num} top-rated ${category}${tag ? " " + tag : ""} products on Amazon. Reply with ONLY a JSON array. No other text. Each object: {"name":"...","price":0.00,"originalPrice":null,"rating":4.5,"reviews":"1,000","image":"","url":"#","bought":""}`
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

    text = text.trim().replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    if (!text.startsWith("[")) {
      const s = text.indexOf("[");
      const e = text.lastIndexOf("]");
      if (s !== -1 && e > s) text = text.substring(s, e + 1);
    }

    try {
      const products = JSON.parse(text);
      if (Array.isArray(products) && products.length > 0) {
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
      }
    } catch (e) {}

    return res.status(200).json({ products: [], error: "Could not parse results", debug: text.substring(0, 300) });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
