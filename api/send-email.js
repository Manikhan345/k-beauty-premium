export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: "API key not configured" });

  try {
    const { type, name, email, message } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    if (type === "subscribe") {
      // ── SUBSCRIBE FORM ──
      // 1. Notify you about new subscriber
      await sendEmail(RESEND_API_KEY, {
        from: "K Beauty Premium <hello@kbeauty.fun>",
        to: "hello@kbeauty.fun",
        subject: "📧 New Subscriber: " + email,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <h2 style="color:#C4956A;">New Subscriber!</h2>
            <p>A new user subscribed to K Beauty Premium updates:</p>
            <p style="font-size:18px;font-weight:bold;color:#3D2B1F;">${email}</p>
            <p style="color:#999;font-size:12px;">Received at ${new Date().toLocaleString()}</p>
          </div>
        `
      });

      // 2. Send welcome email to subscriber
      await sendEmail(RESEND_API_KEY, {
        from: "K Beauty Premium <hello@kbeauty.fun>",
        to: email,
        subject: "Welcome to K Beauty Premium! 🌸",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#FBF6F3;">
            <div style="text-align:center;margin-bottom:20px;">
              <h1 style="font-family:Georgia,serif;color:#3D2B1F;font-size:24px;">K <span style="color:#C4956A;">Beauty</span> Premium</h1>
            </div>
            <div style="background:#fff;border-radius:12px;padding:30px;border:1px solid #E8DDD5;">
              <h2 style="color:#3D2B1F;margin-bottom:12px;">Welcome! 🌸</h2>
              <p style="color:#7A6558;line-height:1.6;">Thank you for subscribing to K Beauty Premium! You'll be the first to know about:</p>
              <ul style="color:#7A6558;line-height:2;">
                <li>New Korean beauty product launches</li>
                <li>Exclusive deals and discounts</li>
                <li>Skincare tips and routines</li>
                <li>Trending K-beauty products</li>
              </ul>
              <div style="text-align:center;margin-top:20px;">
                <a href="https://kbeauty.fun" style="display:inline-block;padding:12px 30px;background:#C4956A;color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;">Shop Now</a>
              </div>
            </div>
            <p style="text-align:center;color:#B09A8A;font-size:11px;margin-top:16px;">K Beauty Premium — Korean Skincare & Beauty Products</p>
          </div>
        `
      });

      return res.status(200).json({ success: true, message: "Subscribed successfully!" });

    } else if (type === "contact") {
      // ── CONTACT FORM ──
      if (!name || !message) return res.status(400).json({ error: "Name and message are required" });

      // 1. Send to you
      await sendEmail(RESEND_API_KEY, {
        from: "K Beauty Premium <hello@kbeauty.fun>",
        to: "hello@kbeauty.fun",
        replyTo: email,
        subject: "💬 Contact Form: " + name,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#C4956A;">New Contact Message</h2>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px;font-weight:bold;color:#3D2B1F;width:80px;">Name:</td><td style="padding:8px;color:#7A6558;">${name}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#3D2B1F;">Email:</td><td style="padding:8px;color:#7A6558;">${email}</td></tr>
            </table>
            <div style="background:#FBF6F3;border-radius:8px;padding:16px;margin-top:12px;">
              <p style="font-weight:bold;color:#3D2B1F;margin-bottom:8px;">Message:</p>
              <p style="color:#7A6558;line-height:1.6;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="color:#999;font-size:12px;margin-top:16px;">Reply directly to this email to respond to ${name}.</p>
          </div>
        `
      });

      // 2. Send confirmation to user
      await sendEmail(RESEND_API_KEY, {
        from: "K Beauty Premium <hello@kbeauty.fun>",
        to: email,
        subject: "We received your message! — K Beauty Premium",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#FBF6F3;">
            <div style="text-align:center;margin-bottom:20px;">
              <h1 style="font-family:Georgia,serif;color:#3D2B1F;font-size:24px;">K <span style="color:#C4956A;">Beauty</span> Premium</h1>
            </div>
            <div style="background:#fff;border-radius:12px;padding:30px;border:1px solid #E8DDD5;">
              <h2 style="color:#3D2B1F;margin-bottom:12px;">Thank you, ${name}! 💌</h2>
              <p style="color:#7A6558;line-height:1.6;">We've received your message and will get back to you within 24 hours.</p>
              <div style="background:#FBF6F3;border-radius:8px;padding:14px;margin:16px 0;">
                <p style="color:#B09A8A;font-size:13px;margin-bottom:4px;">Your message:</p>
                <p style="color:#7A6558;font-size:14px;line-height:1.5;">${message.replace(/\n/g, '<br>')}</p>
              </div>
              <div style="text-align:center;margin-top:20px;">
                <a href="https://kbeauty.fun" style="display:inline-block;padding:12px 30px;background:#C4956A;color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;">Visit Our Store</a>
              </div>
            </div>
            <p style="text-align:center;color:#B09A8A;font-size:11px;margin-top:16px;">K Beauty Premium — Korean Skincare & Beauty Products</p>
          </div>
        `
      });

      return res.status(200).json({ success: true, message: "Message sent successfully!" });

    } else {
      return res.status(400).json({ error: "Invalid form type" });
    }

  } catch (err) {
    console.error("Email error:", err);
    return res.status(500).json({ error: "Failed to send: " + err.message });
  }
}

async function sendEmail(apiKey, options) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey,
    },
    body: JSON.stringify(options),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.message || "Email send failed");
  }
  return await resp.json();
}
