import { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";

let cached: AIProvider | null = null;

/**
 * The ONLY place the app should decide which AI provider to use.
 * Server code calls `await getAIProvider()` — never `new GeminiAIProvider()`
 * directly — so local development and demo mode keep working without
 * Google Cloud credentials.
 *
 * The Gemini implementation is imported dynamically so the
 * @google-cloud/vertexai SDK, and its credential resolution, is never
 * touched when running in mock/demo mode.
 */
export async function getAIProvider(): Promise<AIProvider> {
  if (cached) return cached;

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
