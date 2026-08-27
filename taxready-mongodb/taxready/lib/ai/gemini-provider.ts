import { VertexAI } from "@google-cloud/vertexai";
import { AIProvider, COMPLIANCE_DISCLAIMER } from "./provider";
import { classifyInRobustBatches, ClassifiableTxn } from "./robust-batch";
import {
  buildColumnDetectionPrompt,
  buildTextExtractionPrompt,
  validateColumnMapping,
  validateExtractedRows
} from "./statement-prompts";
import { withRetry } from "./retry";
import {
  Anomaly,
  ClassificationResult,
  FinancialContext,
  AIResponse,
  ReceiptExtraction,
  PeriodSummary,
  Transaction,
  CountryTaxConfig,
  StatementColumnMapping,
  NormalizedStatementRow
} from "@/types";

/**
 * Production AI provider. Talks to Vertex AI Gemini using the project's
 * Google Cloud credentials (Application Default Credentials — never an
 * API key baked into the client). Requires:
 *   VERTEX_AI_PROJECT_ID
 *   VERTEX_AI_LOCATION
 *   GEMINI_MODEL
 * This file only ever runs server-side (API routes / server actions) —
 * never import it from a client component.
 */
export class GeminiAIProvider implements AIProvider {
  readonly name = "gemini" as const;
  private client: VertexAI;
  private model: string;

  constructor() {
    const project = requireEnv("VERTEX_AI_PROJECT_ID");
    const location = process.env.VERTEX_AI_LOCATION ?? "us-central1";
    this.model = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
    this.client = new VertexAI({ project, location });
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
    return parseJsonResponse<ClassificationResult>(result);
  }

  async classifyTransactionsBatch(
    transactions: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">[],
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult[]> {
    return classifyInRobustBatches(transactions, (batch) => this.classifyRawBatch(batch, taxConfig));
  }

  /**
   * One raw round trip to Gemini for a single batch, with no retry or size
   * handling of its own — classifyTransactionsBatch wraps this with
   * classifyInRobustBatches (see robust-batch.ts) so arbitrarily large
   * imports stay reliable. Keep this focused on "one call, one batch."
   */
  private async classifyRawBatch(
    transactions: ClassifiableTxn[],
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult[]> {
    if (transactions.length === 0) return [];

    const system =
      "You are a financial transaction classification assistant for TaxReady, operating in " +
      `${taxConfig.countryName}. You will receive a JSON array of transactions. Classify EACH ONE using ` +
      "ONLY the information provided for it. Do not invent facts. Do not claim legal tax compliance. " +
      "Return a JSON array with EXACTLY one result per input transaction, IN THE SAME ORDER as the " +
      "input array — do not omit, merge, or reorder entries. Each result object must have fields: " +
      "category, subcategory (optional), taxRelevance (one of: vat_related, withholding_tax_related, " +
      "potentially_deductible, needs_documentation, review_required, not_tax_relevant), " +
      "confidence (0-1), reason (one sentence), requiresReview (boolean).";

    const model = this.generativeModel(system);
    const result = await model.generateContent(JSON.stringify(transactions));
    const parsed = parseJsonResponse<ClassificationResult[]>(result);

    if (!Array.isArray(parsed) || parsed.length !== transactions.length) {
      throw new Error(
        `Gemini returned ${Array.isArray(parsed) ? parsed.length : "a non-array"} results for ` +
          `${transactions.length} transactions — refusing to trust misaligned batch output.`
      );
    }
    return parsed;
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
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: input.mimeType, data: input.base64 } }]
        }
      ]
    });
    return parseJsonResponse<ReceiptExtraction>(result);
  }

  async detectStatementColumns(
    sampleRows: (string | number | null | undefined)[][],
    context: { fileName: string; sheetName?: string }
  ): Promise<StatementColumnMapping> {
    const { system, user } = buildColumnDetectionPrompt(sampleRows, context);
    return withRetry(async () => {
      const model = this.generativeModel(system);
      const result = await model.generateContent(user);
      return validateColumnMapping(parseJsonResponse<unknown>(result));
    });
  }

  async extractStatementTransactionsFromText(
    textChunk: string,
    context: { fileName: string }
  ): Promise<NormalizedStatementRow[]> {
    const { system, user } = buildTextExtractionPrompt(textChunk, context);
    return withRetry(async () => {
      const model = this.generativeModel(system);
      const result = await model.generateContent(user);
      return validateExtractedRows(parseJsonResponse<unknown>(result));
    });
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
    return parseJsonResponse<PeriodSummary>(result);
  }

  async detectAnomalies(context: FinancialContext): Promise<Anomaly[]> {
    const system =
      "You are a financial anomaly detection assistant for TaxReady. Identify transactions that look " +
      "unusual, missing documentation, or inconsistent, using only the provided data. Return a JSON array " +
      "of objects with fields: transactionId, reason, severity (low|medium|high).";

    const model = this.generativeModel(system);
    const result = await model.generateContent(JSON.stringify(context.transactions));
    return parseJsonResponse<Anomaly[]>(result);
  }

  async answerQuestion(question: string, context: FinancialContext): Promise<AIResponse> {
    const system =
      "You are Ask TaxReady, a conversational assistant that answers questions about a single " +
      "authenticated business's own financial records. Use ONLY the provided context — never data from " +
      "any other business. For legal or tax-advice questions, respond with this exact disclaimer: " +
      `"${COMPLIANCE_DISCLAIMER}". Return JSON only with fields: answer, citedTransactionIds (array, optional).`;

    const model = this.generativeModel(system);
    const result = await model.generateContent(JSON.stringify({ question, context }));
    return parseJsonResponse<AIResponse>(result);
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

function parseJsonResponse<T>(result: any): T {
  const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Gemini response was not valid JSON — refusing to trust unvalidated output.");
  }
}
