import {
  Anomaly,
  ClassificationResult,
  FinancialContext,
  AIResponse,
  ReceiptExtraction,
  PeriodSummary,
  Transaction,
  StatementColumnMapping,
  NormalizedStatementRow
} from "@/types";
import { CountryTaxConfig } from "@/types";

/**
 * Every AI capability in TaxReady goes through this interface.
 * - GeminiAIProvider (gemini-provider.ts) calls Vertex AI Gemini in production.
 * - MockAIProvider (mock-provider.ts) runs fully offline with deterministic,
 *   explainable heuristics so the app is demoable without Google Cloud credentials.
 *
 * Nothing in app/ or components/ should import a concrete provider directly —
 * always go through getAIProvider() in lib/ai/index.ts.
 */
export interface AIProvider {
  readonly name: "gemini" | "groq" | "mock";

  classifyTransaction(
    transaction: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">,
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult>;

  /**
   * Classify many transactions in a single AI call instead of one call per
   * row. Always prefer this over calling classifyTransaction in a loop for
   * bulk imports — it cuts API usage (and free-tier quota consumption) by
   * roughly the batch size, and it's faster since it's one round trip
   * instead of N parallel ones. Results are returned in the same order as
   * the input array — implementations must preserve order even though the
   * model returns a JSON array.
   */
  classifyTransactionsBatch(
    transactions: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">[],
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult[]>;

  extractReceipt(input: { fileName: string; mimeType: string; base64?: string }): Promise<ReceiptExtraction>;

  /**
   * One-time layout detection for a bank statement sheet/table (see
   * lib/statement-import/*). Given a small sample of rows (NOT the whole
   * sheet — a few dozen rows is plenty), figures out which row the real
   * data starts on and which column is the date / description / amount.
   * The result is applied deterministically to every row of the full
   * sheet by lib/statement-import/apply-mapping.ts — this is the only AI
   * call involved in reading an Excel/CSV statement, regardless of how
   * many thousand rows it has.
   */
  detectStatementColumns(
    sampleRows: (string | number | null | undefined)[][],
    context: { fileName: string; sheetName?: string }
  ): Promise<StatementColumnMapping>;

  /**
   * Extracts whatever transactions appear in one chunk of raw text pulled
   * from a bank statement PDF (see lib/statement-import/pdf-reader.ts).
   * Unlike detectStatementColumns, this runs once per chunk rather than
   * once per file — PDF text has no reliable column structure to detect
   * once and replay deterministically, so each chunk is read directly.
   * May return zero results for a chunk with no transactions in it (a
   * cover page, a summary section) — that's normal, not an error.
   */
  extractStatementTransactionsFromText(
    textChunk: string,
    context: { fileName: string }
  ): Promise<NormalizedStatementRow[]>;

  summarizePeriod(context: FinancialContext, periodLabel: string): Promise<PeriodSummary>;

  detectAnomalies(context: FinancialContext): Promise<Anomaly[]>;

  answerQuestion(question: string, context: FinancialContext): Promise<AIResponse>;
}

export const COMPLIANCE_DISCLAIMER =
  "I can help organize and summarize your records, but this should be reviewed with a qualified tax professional.";
