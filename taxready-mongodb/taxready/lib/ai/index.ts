import { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";

let cached: AIProvider | null = null;

/**
 * The ONLY place the app should decide which AI provider to use.
 * Server code calls `await getAIProvider()` — never `new GeminiAIProvider()`
 * or `new GeminiApiKeyProvider()` directly — so local development and demo
 * mode keep working without any Google credentials at all.
 *
 * Both real providers are imported dynamically so their SDKs (and, for
 * Vertex AI, its credential resolution) are never touched when running in
 * mock/demo mode.
 *
 * Preference order:
 *   1. GEMINI_API_KEY set -> GeminiApiKeyProvider (plain Gemini API, works
 *      anywhere including Vercel — no service-account credentials needed).
 *   2. VERTEX_AI_PROJECT_ID + GOOGLE_CLOUD_PROJECT_ID set -> GeminiAIProvider
 *      (Vertex AI via Application Default Credentials — only works on a
 *      host that provides ADC, e.g. Cloud Run. Vercel does NOT provide
 *      this automatically, so this path silently fails over to mock
 *      unless you've explicitly wired a service account.)
 *   3. Neither set -> MockAIProvider (offline, deterministic, demo-only —
 *      does not actually read receipt content).
 */
export async function getAIProvider(): Promise<AIProvider> {
  if (cached) return cached;

  if (process.env.GEMINI_API_KEY) {
    const { GeminiApiKeyProvider } = await import("./gemini-api-provider");
    cached = new GeminiApiKeyProvider();
    return cached;
  }

  const hasVertexConfig = Boolean(process.env.VERTEX_AI_PROJECT_ID && process.env.GOOGLE_CLOUD_PROJECT_ID);

  if (hasVertexConfig) {
    const { GeminiAIProvider } = await import("./gemini-provider");
    cached = new GeminiAIProvider();
  } else {
    cached = new MockAIProvider();
  }
  return cached;
}

export * from "./provider";
