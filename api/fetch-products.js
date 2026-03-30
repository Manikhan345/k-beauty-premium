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
            content: `Find the top ${count || 10} best-selling ${category}${tag ? " " + tag : ""} products currently available on Amazon.com with high ratings.

Return your response as a JSON array ONLY. No text before or after. No markdown. No backticks. Just a raw JSON array.

Each object in the array must have exactly these fields:
{
  "name": "Full product name",
  "price": 14.99,
  "originalPrice": 19.99,
  "rating": 4.8,
  "reviews": "12,450",
  "image": "https://m.media-amazon.com/images/I/example.jpg",
  "url": "https://www.amazon.com/dp/ASIN",
  "bought": "10K+ bought in past month"
}

Rules:
- price must be a number, not a string
- originalPrice should be null if there is no discount
- rating must be a number between 1 and 5
- reviews should be a formatted string like "12,450"
- image must be a real Amazon image URL or empty string ""
- url must be a real Amazon product URL or "#"
- bought should be like "10K+ bought in past month" or empty string ""
- Return ONLY the JSON array, starting with [ and ending with ]`
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message || "Anthropic API error" });
    }

    // Collect ALL text blocks from the response
    let allText = "";
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === "text") {
          allText += block.text;
        }
      }
    }

    if (!allText) {
      return res.status(200).json({ products: [], error: "No text in API response" });
    }

    // Clean up the text - remove markdown, extra whitespace
    allText = allText.trim();
    allText = allText.replace(/```json\s*/gi, "");
    allText = allText.replace(/```\s*/gi, "");
    allText = allText.trim();

    // Try to find JSON array in the text
    let jsonStr = allText;

    // If the text doesn't start with [, try to find the array
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
        // Clean up each product to ensure correct types
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
      } else {
        return res.status(200).json({ products: [], error: "Empty or invalid product array" });
      }
    } catch (parseErr) {
      // Return the raw text for debugging
      return res.status(200).json({ 
        products: [], 
        error: "Failed to parse JSON", 
        debug: allText.substring(0, 500) 
      });
    }

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
