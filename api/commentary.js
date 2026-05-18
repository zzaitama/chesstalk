const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_CONTENT_CHARS = 50000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const ipRequests = new Map();

function getClientIp(req) {
  const vercelIp = req.headers["x-vercel-forwarded-for"];
  if (vercelIp) return vercelIp.split(",")[0].trim();
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const parts = forwarded.split(",");
    return parts[parts.length - 1].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  if (ipRequests.size > 5000) {
    for (const [k, v] of ipRequests) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW_MS) ipRequests.delete(k);
    }
  }
  const entry = ipRequests.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  ipRequests.set(ip, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  const { messages, system, max_tokens } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request: messages required" });
  }

  const totalChars = messages.reduce((sum, m) => {
    const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    return sum + content.length;
  }, 0) + (system ? system.length : 0);

  if (totalChars > MAX_CONTENT_CHARS) {
    return res.status(400).json({ error: "Content too large" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: Math.min(Math.max(parseInt(max_tokens) || 1000, 1), 1000),
        system,
        messages,
      }),
      signal: controller.signal,
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Analysis unavailable" });
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Failed to reach Anthropic API" });
  } finally {
    clearTimeout(timeout);
  }
}
