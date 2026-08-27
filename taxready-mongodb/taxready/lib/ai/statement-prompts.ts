import { NormalizedStatementRow, StatementAmountMode, StatementColumnMapping } from "@/types";

/**
 * Shared between all three AIProvider implementations (Groq, Gemini,
 * Mock) so the prompt wording and — more importantly — the response
 * validation logic live in exactly one place. A provider-specific bug
 * here would be easy to miss if each provider re-implemented its own
 * parsing/validation of the same JSON shape.
 */

export function buildColumnDetectionPrompt(
  sampleRows: (string | number | null | undefined)[][],
  context: { fileName: string; sheetName?: string }
): { system: string; user: string } {
  const system =
    "You are a bank statement layout analyst for TaxReady. You will see the first rows of a spreadsheet " +
    "or CSV that may include title/metadata rows before the real column header, followed by transaction " +
    "data. Identify the layout so it can be applied programmatically to the FULL sheet (which you do not " +
    "see). Respond with a JSON object with EXACTLY these fields: " +
    '"dataStartRowIndex" (integer — the row index, 0-based within the sample you were given, where the ' +
    'FIRST actual transaction row begins — i.e. one past the header row), "dateColumnIndex" (integer), ' +
    '"descriptionColumnIndex" (integer), "amountMode" (one of "separate_debit_credit", ' +
    '"single_with_type_column", "single_signed"), "amountColumnIndex" (integer, only for single_signed or ' +
    "single_with_type_column), \"typeColumnIndex\" (integer, only for single_with_type_column), " +
    '"debitColumnIndex" and "creditColumnIndex" (integers, only for separate_debit_credit), ' +
    '"positiveMeans" (one of "income" or "expense" — only for single_signed, describing what a positive ' +
    'number in the amount column means), "dateFormatHint" (a short example pattern like "dd MMM yyyy" or ' +
    '"yyyy-MM-dd", optional), "confidence" (0-1), "notes" (one short sentence, optional). All column ' +
    "indexes are 0-based and refer to the row arrays you were given. Do not invent columns that aren't " +
    "present in the sample.";

  const user = JSON.stringify({ fileName: context.fileName, sheetName: context.sheetName, sampleRows });
  return { system, user };
}

const VALID_AMOUNT_MODES: StatementAmountMode[] = ["separate_debit_credit", "single_with_type_column", "single_signed"];

export function validateColumnMapping(parsed: unknown): StatementColumnMapping {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Column mapping response was not a JSON object.");
  }
  const p = parsed as Record<string, unknown>;

  const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

  if (!isInt(p.dataStartRowIndex) || !isInt(p.dateColumnIndex) || !isInt(p.descriptionColumnIndex)) {
    throw new Error("Column mapping response is missing required integer fields.");
  }
  if (typeof p.amountMode !== "string" || !VALID_AMOUNT_MODES.includes(p.amountMode as StatementAmountMode)) {
    throw new Error(`Column mapping response has an invalid amountMode: ${String(p.amountMode)}`);
  }

  const amountMode = p.amountMode as StatementAmountMode;

  if (amountMode === "separate_debit_credit" && (!isInt(p.debitColumnIndex) || !isInt(p.creditColumnIndex))) {
    throw new Error("separate_debit_credit mapping is missing debitColumnIndex/creditColumnIndex.");
  }
  if ((amountMode === "single_signed" || amountMode === "single_with_type_column") && !isInt(p.amountColumnIndex)) {
    throw new Error(`${amountMode} mapping is missing amountColumnIndex.`);
  }
  if (amountMode === "single_with_type_column" && !isInt(p.typeColumnIndex)) {
    throw new Error("single_with_type_column mapping is missing typeColumnIndex.");
  }

  return {
    dataStartRowIndex: p.dataStartRowIndex as number,
    dateColumnIndex: p.dateColumnIndex as number,
    descriptionColumnIndex: p.descriptionColumnIndex as number,
    amountMode,
    amountColumnIndex: isInt(p.amountColumnIndex) ? p.amountColumnIndex : undefined,
    typeColumnIndex: isInt(p.typeColumnIndex) ? p.typeColumnIndex : undefined,
    debitColumnIndex: isInt(p.debitColumnIndex) ? p.debitColumnIndex : undefined,
    creditColumnIndex: isInt(p.creditColumnIndex) ? p.creditColumnIndex : undefined,
    positiveMeans: p.positiveMeans === "income" || p.positiveMeans === "expense" ? p.positiveMeans : undefined,
    dateFormatHint: typeof p.dateFormatHint === "string" ? p.dateFormatHint : undefined,
    confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
    notes: typeof p.notes === "string" ? p.notes : undefined
  };
}

export function buildTextExtractionPrompt(textChunk: string, context: { fileName: string }): { system: string; user: string } {
  const system =
    "You are a bank statement transaction extractor for TaxReady. You will see a chunk of raw text " +
    "extracted from a page (or part of a page) of a bank statement PDF. Extract every transaction you can " +
    "find in this text. Do not invent transactions that aren't there. It is normal and expected for a " +
    'chunk to contain zero transactions (e.g. a cover page or summary section). Respond with a JSON ' +
    'object of the exact shape {"transactions": [...]} where each item has fields: "date" (YYYY-MM-DD — ' +
    'convert from whatever format appears in the text), "description" (string), "amount" (positive ' +
    'number, no currency symbols or commas), "type" (one of "income" or "expense" — income for money ' +
    "coming in/credits/deposits, expense for money going out/debits/withdrawals).";

  const user = `File: ${context.fileName}\n\nText:\n${textChunk}`;
  return { system, user };
}

export function validateExtractedRows(parsed: unknown): NormalizedStatementRow[] {
  if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { transactions?: unknown }).transactions)) {
    throw new Error("Statement text extraction response did not contain a transactions array.");
  }

  const transactions = (parsed as { transactions: unknown[] }).transactions;
  const rows: NormalizedStatementRow[] = [];

  for (const item of transactions) {
    if (typeof item !== "object" || item === null) continue;
    const t = item as Record<string, unknown>;
    if (
      typeof t.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
      typeof t.description === "string" &&
      t.description.trim() !== "" &&
      typeof t.amount === "number" &&
      Number.isFinite(t.amount) &&
      t.amount > 0 &&
      (t.type === "income" || t.type === "expense")
    ) {
      rows.push({ date: t.date, description: t.description.trim(), amount: t.amount, type: t.type });
    }
    // Malformed individual entries are silently skipped rather than
    // failing the whole chunk — a partially-garbled row shouldn't cost
    // every other transaction the model read correctly in the same chunk.
  }

  return rows;
}
