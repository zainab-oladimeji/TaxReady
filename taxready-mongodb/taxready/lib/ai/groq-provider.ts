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
 * Free alternative to Gemini for hosts/users who can't get Google Cloud
 * billing linked (declined cards, region restrictions, etc). Groq's free
 * tier requires no credit card at all and has a far more generous daily
 * request allowance than Gemini's free tier.
 *
 * Uses Groq's OpenAI-compatible REST API directly via fetch — no extra SDK
 * dependency needed. Text tasks (classification, summaries, Q&A) use a
 * general chat model; receipt extraction uses a vision-capable model,
 * since it has to read the actual receipt image.
 *
 * Groq's free-tier model lineup changes fairly often (models get
 * deprecated and replaced). If this provider starts erroring with a
 * "model not found" or "decommissioned" message, check
 * console.groq.com/docs/models for the current model list and update
 * GROQ_MODEL / GROQ_VISION_MODEL in your environment variables — no code
 * change needed, both are configurable.
 */
export class GroqProvider implements AIProvider {
  readonly name = "groq" as const;
  private apiKey: string;
  private textModel: string;
  private visionModel: string;
  private static readonly BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

  constructor() {
    this.apiKey = requireEnv("GROQ_API_KEY");
    this.textModel = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
    this.visionModel = process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.6-27b";
  }

  private async chat(model: string, systemPrompt: string, userContent: unknown): Promise<string> {
    const res = await fetch(GroqProvider.BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ]
      })
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Groq API error (${res.status} ${res.statusText}) using model "${model}": ${errorBody}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq returned no content.");
    return text;
  }

  async classifyTransaction(
    transaction: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">,
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult> {
    const [result] = await this.classifyTransactionsBatch([transaction], taxConfig);
    return result;
  }

  async classifyTransactionsBatch(
    transactions: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">[],
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult[]> {
    if (transactions.length === 0) return [];

    const system =
      "You are a financial transaction classification assistant for TaxReady, operating in " +
      `${taxConfig.countryName}. You will receive a JSON object with a "transactions" array. Classify ` +
      "EACH ONE using ONLY the information provided for it. Do not invent facts. Do not claim legal tax " +
      'compliance. Respond with a JSON object of the exact shape {"results": [...]} containing EXACTLY ' +
      "one result per input transaction, IN THE SAME ORDER as the input array — do not omit, merge, or " +
      "reorder entries. Each result object must have fields: category, subcategory (optional), " +
      "taxRelevance (one of: vat_related, withholding_tax_related, potentially_deductible, " +
      "needs_documentation, review_required, not_tax_relevant), confidence (0-1), reason (one sentence), " +
      "requiresReview (boolean).";

    const text = await this.chat(this.textModel, system, JSON.stringify({ transactions }));
    const parsed = parseJsonResponse<{ results: ClassificationResult[] }>(text);

    if (!Array.isArray(parsed.results) || parsed.results.length !== transactions.length) {
      throw new Error(
        `Groq returned ${Array.isArray(parsed.results) ? parsed.results.length : "a non-array"} results for ` +
          `${transactions.length} transactions — refusing to trust misaligned batch output.`
      );
    }
    return parsed.results;
  }

  async extractReceipt(input: { fileName: string; mimeType: string; base64?: string }): Promise<ReceiptExtraction> {
    if (!input.base64) {
      throw new Error("extractReceipt requires base64 document data for the Groq provider.");
    }
    const system =
      "You are a document understanding assistant for TaxReady. Extract structured data from this " +
      "receipt or invoice image. Do not invent values you cannot see. Respond with a JSON object with " +
      "fields: merchant, date (YYYY-MM-DD), amount (number), vatAmount (number, optional), currency " +
      "(ISO code), category, paymentMethod (optional), confidence (0-1).";

    const userContent = [
      { type: "text", text: `Extract the receipt data from this image (file: ${input.fileName}).` },
      { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.base64}` } }
    ];

    const text = await this.chat(this.visionModel, system, userContent);
    return parseJsonResponse<ReceiptExtraction>(text);
  }

  async summarizePeriod(context: FinancialContext, periodLabel: string): Promise<PeriodSummary> {
    const system =
      "You are a financial summarization assistant for TaxReady. Summarize this period's transactions " +
      "factually, using only the provided data. Never claim tax compliance. Respond with a JSON object " +
      "with fields: periodLabel, totalRevenue, totalExpenses, netPosition, transactionCount, " +
      "categorizedCount, needsReviewCount, narrative (2-3 sentences).";

    const text = await this.chat(
      this.textModel,
      system,
      JSON.stringify({ periodLabel, transactions: context.transactions })
    );
    return parseJsonResponse<PeriodSummary>(text);
  }

  async detectAnomalies(context: FinancialContext): Promise<Anomaly[]> {
    const system =
      "You are a financial anomaly detection assistant for TaxReady. Identify transactions that look " +
      "unusual, missing documentation, or inconsistent, using only the provided data. Respond with a " +
      'JSON object of the exact shape {"anomalies": [...]} where each item has fields: transactionId, ' +
      "reason, severity (low|medium|high).";

    const text = await this.chat(this.textModel, system, JSON.stringify({ transactions: context.transactions }));
    const parsed = parseJsonResponse<{ anomalies: Anomaly[] }>(text);
    return parsed.anomalies ?? [];
  }

  async answerQuestion(question: string, context: FinancialContext): Promise<AIResponse> {
    const system =
      "You are Ask TaxReady, a conversational assistant that answers questions about a single " +
      "authenticated business's own financial records. Use ONLY the provided context — never data from " +
      "any other business. For legal or tax-advice questions, respond with this exact disclaimer: " +
      `"${COMPLIANCE_DISCLAIMER}". Respond with a JSON object with fields: answer, citedTransactionIds ` +
      "(array, optional).";

    const text = await this.chat(this.textModel, system, JSON.stringify({ question, context }));
    return parseJsonResponse<AIResponse>(text);
  }
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable ${key}. Set it in .env.local or Vercel.`);
  }
  return value;
}

function parseJsonResponse<T>(text: string | undefined): T {
  if (!text) throw new Error("Groq returned no content.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Groq response was not valid JSON — refusing to trust unvalidated output.");
  }
}
