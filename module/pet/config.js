// API config — gitignored, keep this file local only
const AI_CONFIG = {
  // ---- providers: where to send the request + how to authenticate ----
  // `api` selects the request/response shape pet.js builds:
  //   "openai" → OpenAI-style /chat/completions (Bearer auth)
  //   "gemini" → Google native /models/{model}:generateContent (x-goog-api-key)
  providers: {
    glm: {
      api: "openai",
      url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      apiKey: "2c2166f2060c4569923c8d365acff453.RHOcDqwta94E00R3"
    },
    gemini: {
      api: "gemini",
      // request URL is built as baseUrl + "/models/" + model + ":generateContent"
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: "AQ.Ab8RN6KAlE_Rcwb8HmUIgskQHSBZJlDOxAWpB59cVfiopXJVdg"
    }
  },

  // ---- selectable models (populate the pet's model dropdown, in order) ----
  // foreignOnly: true → only reachable on a non-China network; UI tags "(china foreign only)"
  // cnOnly:      true → only reachable from within China;       UI tags "(china only)"
  models: [
    { label: "GLM-4-Flash",           provider: "glm",    model: "glm-4-flash",          cnOnly: true },
    { label: "Gemini 2.5 Flash",      provider: "gemini", model: "gemini-2.5-flash",      foreignOnly: true },
    { label: "Gemini 2.0 Flash",      provider: "gemini", model: "gemini-2.0-flash",      foreignOnly: true },
    { label: "Gemini 2.5 Flash-Lite", provider: "gemini", model: "gemini-2.5-flash-lite", foreignOnly: true },
    { label: "Gemini 3.5 Flash",      provider: "gemini", model: "gemini-3.5-flash",      foreignOnly: true }
  ],

  // ---- region-based default model (chosen automatically by IP on load) ----
  // China IP  → glm  (foreign models are unreachable there)
  // non-China → gemini
  defaults: {
    cn:      "glm-4-flash",
    foreign: "gemini-3.5-flash"
  }
};
