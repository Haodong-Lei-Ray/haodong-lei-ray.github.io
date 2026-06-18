// API config — no secret keys live here anymore.
//
// GLM is called directly (it's China-hosted and its key isn't auto-revoked).
// Gemini + Cloudflare AI go through your Cloudflare Worker proxy
// (cloudflare-worker/pet-ai-proxy.js), which holds the real Gemini key as a
// server-side Secret and runs Cloudflare's own models via the AI binding —
// so nothing here can be leaked or auto-revoked.
//
// ⚠️ After deploying the Worker, replace the host below with YOUR worker URL.
const PET_PROXY = "https://pet-proxy.haodong-lei.workers.dev";

const AI_CONFIG = {
  // ---- providers: where to send the request + how to authenticate ----
  // `api` selects the request/response shape pet.js builds:
  //   "openai"     → OpenAI-style /chat/completions (Bearer auth)        [GLM]
  //   "gemini"     → Google native /models/<m>:generateContent (proxied) [Gemini]
  //   "cloudflare" → Worker /cf/run → env.AI.run(), returns {response}    [Cloudflare AI]
  providers: {
    glm: {
      api: "openai",
      url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      apiKey: "2c2166f2060c4569923c8d365acff453.RHOcDqwta94E00R3"
    },
    gemini: {
      api: "gemini",
      // request URL = baseUrl + "/models/" + model + ":generateContent"
      // (no apiKey here — the Worker injects the GEMINI_KEY secret server-side)
      baseUrl: PET_PROXY + "/v1beta"
    },
    cf: {
      api: "cloudflare",
      // Worker's Cloudflare-AI route; the AI binding needs no key at all.
      baseUrl: PET_PROXY + "/cf/run"
    }
  },

  // ---- selectable models (populate the pet's model dropdown, in order) ----
  models: [
    { label: "GLM-4-Flash",              provider: "glm",    model: "glm-4-flash" },
    { label: "Gemini 2.5 Flash",         provider: "gemini", model: "gemini-2.5-flash" },
    { label: "Gemini 2.5 Pro",           provider: "gemini", model: "gemini-2.5-pro" },
    { label: "Gemini 2.0 Flash",         provider: "gemini", model: "gemini-2.0-flash" },
    { label: "Gemini 2.5 Flash-Lite",    provider: "gemini", model: "gemini-2.5-flash-lite" },
    { label: "Gemini 3.5 Flash",         provider: "gemini", model: "gemini-3.5-flash" },
    { label: "Llama 3.3 70B · Cloudflare", provider: "cf", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" },
    { label: "qwen2.5-coder-32b-instruct · Cloudflare",  provider: "cf", model: "@cf/qwen/qwen2.5-coder-32b-instruct" }
  ],

  // ---- region-based default model (chosen automatically by IP on load) ----
  // China IP  → glm  (domestic, direct, most reliable)
  // non-China → gemini
  defaults: {
    cn:      "glm-4-flash",
    foreign: "gemini-3.5-flash"
  }
};
