/**
 * Cloudflare Worker — AI proxy for the pixel pet.
 *
 * Two jobs, one Worker:
 *   1. Gemini proxy:   POST /v1beta/models/<model>:generateContent
 *        → forwards to Google, injecting the GEMINI_KEY secret server-side.
 *   2. Cloudflare AI:  POST /cf/run   body {"model":"@cf/...","messages":[...]}
 *        → runs Cloudflare's own model via the AI binding (NO key needed at all).
 *
 * Neither the Gemini key nor any Cloudflare token ever touches the browser or
 * the website repo, so nothing gets leaked or auto-revoked.
 *
 * ── DEPLOY (dashboard, no CLI) ─────────────────────────────────────────
 *  1. dash.cloudflare.com → "Workers & Pages" → Create → Worker → name it
 *     "pet-proxy" → Deploy.  Then "Edit code" → paste this whole file → Deploy.
 *  2. Settings → Bindings → Add → "Workers AI" → Variable name: AI
 *        (this enables the /cf/run route — Llama / Qwen, no key)
 *  3. Settings → Variables and Secrets → Add → type Secret →
 *        name: GEMINI_KEY, value: your Gemini key  (this enables the /v1beta Gemini route)
 *  4. Save and deploy. Copy https://pet-proxy.<your-subdomain>.workers.dev
 *     into module/pet/config.js (the PET_PROXY constant).
 * ───────────────────────────────────────────────────────────────────────
 */

const GOOGLE_API = "https://generativelanguage.googleapis.com";

// Only these origins may use the proxy (stops strangers from burning your quota).
const ALLOWED_ORIGINS = [
  "https://haodong-lei-ray.github.io",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return new Response("Only POST is allowed", { status: 405, headers: cors });

    const url = new URL(request.url);

    // ── Route 2: Cloudflare Workers AI (no key — uses the AI binding) ──
    if (url.pathname === "/cf/run") {
      if (!env.AI) return json({ error: { message: "AI binding not configured on the Worker" } }, 500, cors);
      let body;
      try { body = await request.json(); }
      catch (e) { return json({ error: { message: "bad JSON" } }, 400, cors); }
      const model = body.model;
      if (!model || !model.startsWith("@cf/")) {
        return json({ error: { message: "missing or invalid @cf/ model" } }, 400, cors);
      }
      try {
        // Cloudflare AI takes OpenAI-style messages and returns { response: "..." }
        const result = await env.AI.run(model, { messages: body.messages || [] });
        return json(result, 200, cors);
      } catch (e) {
        return json({ error: { message: String(e) } }, 502, cors);
      }
    }

    // ── Route 1: Gemini proxy (inject GEMINI_KEY, forward to Google) ──
    if (url.pathname.startsWith("/v1beta/") || url.pathname.startsWith("/v1/")) {
      if (!env.GEMINI_KEY) return json({ error: { message: "GEMINI_KEY secret is not set" } }, 500, cors);
      const target = GOOGLE_API + url.pathname + url.search;
      const upstream = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
        body: await request.text(),
      });
      // Pass straight back (works for normal + streaming bodies), add CORS.
      const headers = new Headers(upstream.headers);
      for (const [k, v] of Object.entries(cors)) headers.set(k, v);
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
