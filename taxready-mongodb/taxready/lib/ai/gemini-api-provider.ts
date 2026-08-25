import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, COMPLIANCE_DISCLAIMER } from "./provider";
import {
  Anomaly,
  ClassificationResult,
  FinancialContext,
  AIResponse,
  ReceiptExtraction,
  PeriodSummary,
  Transaction,
  CountryTaxConfig
} from "@/types";

/**
 * Production AI provider for hosts without native Google Cloud credential
 * resolution (Vercel, Netlify, etc). Talks directly to the Gemini API with
 * a single API key (GEMINI_API_KEY) — no Application Default Credentials,
 * no service-account JSON, no VPC. This is the provider that should be
 * used for the Vercel deployment.
 *
 * The Vertex AI provider (gemini-provider.ts) is kept for a future move to
 * Cloud Run, where ADC works natively. Do not import either provider
 * directly outside lib/ai/index.ts.
 */
export class GeminiApiKeyProvider implements AIProvider {
  readonly name = "gemini" as const;
  private client: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const apiKey = requireEnv("GEMINI_API_KEY");
    this.model = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private generativeModel(systemInstruction: string) {
    return this.client.getGenerativeModel({
      model: this.model,
      systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });
  }

  async classifyTransaction(
    transaction: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">,
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult> {
    const system =
      "You are a financial transaction classification assistant for TaxReady, operating in " +
      `${taxConfig.countryName}. Classify the transaction using ONLY the provided information. ` +
      "Do not invent facts. Do not claim legal tax compliance. Return JSON only with fields: " +
      "category, subcategory (optional), taxRelevance (one of: vat_related, withholding_tax_related, " +
      "potentially_deductible, needs_documentation, review_required, not_tax_relevant), " +
      "confidence (0-1), reason (one sentence), requiresReview (boolean).";

    const model = this.generativeModel(system);
    const result = await model.generateContent(JSON.stringify(transaction));
    return parseJsonResponse<ClassificationResult>(result.response.text());
  }

  async extractReceipt(input: { fileName: string; mimeType: string; base64?: string }): Promise<ReceiptExtraction> {
    if (!input.base64) {
      throw new Error("extractReceipt requires base64 document data for the Gemini provider.");
    }
    const system =
      "You are a document understanding assistant for TaxReady. Extract structured data from this " +
      "receipt or invoice image. Do not invent values you cannot see. Return JSON only with fields: " +
      "merchant, date (YYYY-MM-DD), amount (number), vatAmount (number, optional), currency (ISO code), " +
      "category, paymentMethod (optional), confidence (0-1).";

    const model = this.generativeModel(system);
    const result = await model.generateContent([
      { inlineData: { mimeType: input.mimeType, data: input.base64 } }
    ]);
    return parseJsonResponse<ReceiptExtraction>(result.response.text());
  }

  async summarizePeriod(context: FinancialContext, periodLabel: string): Promise<PeriodSummary> {
    const system =
      "You are a financial summarization assistant for TaxReady. Summarize this period's transactions " +
      "factually, using only the provided data. Never claim tax compliance. Return JSON only with fields: " +
      "periodLabel, totalRevenue, totalExpenses, netPosition, transactionCount, categorizedCount, " +
      "needsReviewCount, narrative (2-3 sentences).";

    const model = this.generativeModel(system);
    const result = await model.generateContent(
      JSON.stringify({ periodLabel, transactions: context.transactions })
    );
    return parseJsonResponse<PeriodSummary>(result.response.text());
  }

  async detectAnomalies(context: FinancialContext): Promise<Anomaly[]> {
    const system =
      "You are a financial anomaly detection assistant for TaxReady. Identify transactions that look " +
      "unusual, missing documentation, or inconsistent, using only the provided data. Return a JSON array " +
      "of objects with fields: transactionId, reason, severity (low|medium|high).";

    const model = this.generativeModel(system);
    const result = await model.generateContent(JSON.stringify(context.transactions));
    return parseJsonResponse<Anomaly[]>(result.response.text());
  }

  async answerQuestion(question: string, context: FinancialContext): Promise<AIResponse> {
    const system =
      "You are Ask TaxReady, a conversational assistant that answers questions about a single " +
      "authenticated business's own financial records. Use ONLY the provided context — never data from " +
      "any other business. For legal or tax-advice questions, respond with this exact disclaimer: " +
      `"${COMPLIANCE_DISCLAIMER}". Return JSON only with fields: answer, citedTransactionIds (array, optional).`;

    const model = this.generativeModel(system);
    const result = await model.generateContent(JSON.stringify({ question, context }));
    return parseJsonResponse<AIResponse>(result.response.text());
  }
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${key}. Set it in .env.local or fall back to MockAIProvider.`
    );
  }
  return value;
}

function parseJsonResponse<T>(text: string | undefined): T {
  if (!text) throw new Error("Gemini returned no content.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Gemini response was not valid JSON — refusing to trust unvalidated output.");
  }
}
