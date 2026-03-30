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
    const num = count || 10;

    // Step 1: Search for products with web search
    const searchResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `Search for the top ${num} best-selling ${category}${tag ? " " + tag : ""} products on Amazon. List each product with its name, approximate price, rating, number of reviews, and Amazon ASIN if possible. Focus on highly rated products with many reviews.`
          }
        ]
      })
    });

    const searchData = await searchResponse.json();
    if (searchData.error) {
      return res.status(400).json({ error: searchData.error.message || "Search failed" });
    }

    // Extract search results text
    let searchText = "";
    if (searchData.content && Array.isArray(searchData.content)) {
      for (const block of searchData.content) {
        if (block.type === "text") searchText += block.text;
      }
    }

    if (!searchText) {
      return res.status(200).json({ products: [], error: "No search results found" });
    }

    // Step 2: Convert search results to structured JSON (no web search needed)
    const formatResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `Here are search results about Amazon products:

${searchText}

Convert this into a JSON array of ${num} products. Output ONLY a valid JSON array, nothing else. No markdown, no backticks, no explanation before or after.

Each object must have exactly these fields:
- "name": full product name (string)
- "price": current price in USD (number like 14.99, estimate if not exact)
- "originalPrice": original price if discounted (number or null)
- "rating": star rating (number like 4.8, estimate based on stars mentioned)
- "reviews": review count as formatted string (like "12,450", estimate if not exact)
- "image": empty string ""
- "url": Amazon URL if found, otherwise "https://www.amazon.com/s?k=" followed by URL-encoded product name
- "bought": popularity info like "10K+ bought in past month" or ""

Output ONLY the JSON array. Start with [ end with ]. Nothing else.`
          }
        ]
      })
    });

    const formatData = await formatResponse.json();
    if (formatData.error) {
      return res.status(400).json({ error: formatData.error.message || "Format failed" });
    }

    let formatText = "";
    if (formatData.content && Array.isArray(formatData.content)) {
      for (const block of formatData.content) {
        if (block.type === "text") formatText += block.text;
      }
    }

    // Clean up
    formatText = formatText.trim();
    formatText = formatText.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    // Find JSON array
    let jsonStr = formatText;
    if (!jsonStr.startsWith("[")) {
      const startIdx = jsonStr.indexOf("[");
      const endIdx = jsonStr.lastIndexOf("]");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }
    }

    try {
      const products = JSON.parse(jsonStr);
      if (Array.isArray(products) && products.length > 0) {
        const cleaned = products.map(p => ({
          name: String(p.name || "Unknown Product"),
          price: parseFloat(p.price) || 0,
          originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
          rating: parseFloat(p.rating) || 4.5,
          reviews: String(p.reviews || "0"),
          image: String(p.image || ""),
          url: String(p.url || "#"),
          bought: String(p.bought || "")
        }));
        return res.status(200).json({ products: cleaned });
      }
      return res.status(200).json({ products: [], error: "No products parsed" });
    } catch (parseErr) {
      return res.status(200).json({
        products: [],
        error: "Failed to parse JSON",
        debug: formatText.substring(0, 500)
      });
    }

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
