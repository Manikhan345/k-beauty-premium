export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { category, tag, count } = req.body;

    const searchQuery = `best selling ${category}${tag ? " " + tag : ""} products on Amazon`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
            content: `Search Amazon for the top ${count || 10} best-selling ${category}${tag ? " " + tag : ""} products available on Amazon right now. 

For each product, return a JSON array with objects containing EXACTLY these fields:
- name: full product name as listed on Amazon
- price: current price as a number (e.g. 14.72)
- originalPrice: original price as number if on sale, otherwise null
- rating: rating as number (e.g. 4.8)
- reviews: review count as string (e.g. "87,420")
- image: Amazon product image URL (must start with https://m.media-amazon.com/images/ or https://images-na.ssl-images-amazon.com/)
- url: full Amazon product URL
- bought: popularity text like "10K+ bought in past month" or empty string if not available

IMPORTANT: Return ONLY the raw JSON array. No markdown backticks, no explanation, no preamble. Just the JSON array starting with [ and ending with ].`
          }
        ]
      })
    });

    const data = await response.json();

    // Extract text content from response
    let text = "";
    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text") text += block.text;
      }
    }

    // Clean up any markdown formatting
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    // Try to parse as JSON
    try {
      const products = JSON.parse(text);
      return res.status(200).json({ products });
    } catch (parseErr) {
      // If parsing fails, return raw text for debugging
      return res.status(200).json({ products: [], raw: text, error: "Failed to parse product data" });
    }

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
