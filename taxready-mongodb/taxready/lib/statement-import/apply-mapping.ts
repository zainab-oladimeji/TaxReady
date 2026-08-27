import { NormalizedStatementRow, StatementColumnMapping } from "@/types";
import { parseFlexibleAmount } from "./parse-amount";
import { parseFlexibleDate } from "./parse-date";

export type RawTableRow = (string | number | null | undefined)[];

export interface ApplyMappingResult {
  rows: NormalizedStatementRow[];
  // Rows in the data region that didn't produce a usable transaction —
  // missing date, missing description, or no amount in either the
  // expected debit/credit/amount column(s). Reported to the user rather
  // than silently dropped, since a wrong mapping tends to show up as a
  // spike in this count.
  skippedRowCount: number;
}

/**
 * Turns every row of a sheet/table into normalized transactions using a
 * mapping that an AI call determined ONCE from a small sample (see
 * lib/ai/provider.ts#detectStatementColumns). This function itself makes
 * no AI calls and is fully deterministic — safe to run against a sheet
 * with thousands of rows with no added cost or latency beyond the loop
 * itself.
 */
export function applyColumnMapping(allRows: RawTableRow[], mapping: StatementColumnMapping): ApplyMappingResult {
  const rows: NormalizedStatementRow[] = [];
  let skippedRowCount = 0;

  const startIndex = Math.max(mapping.dataStartRowIndex, 0);

  for (let i = startIndex; i < allRows.length; i++) {
    const raw = allRows[i];
    if (!raw || raw.every((cell) => cell === undefined || cell === null || String(cell).trim() === "")) {
      continue; // blank row — not a skip, just nothing to report
    }

    const date = parseFlexibleDate(raw[mapping.dateColumnIndex], mapping.dateFormatHint);
    const descriptionRaw = raw[mapping.descriptionColumnIndex];
    const description = descriptionRaw != null ? String(descriptionRaw).trim() : "";

    if (!date || !description) {
      skippedRowCount++;
      continue;
    }

    const resolved = resolveAmountAndType(raw, mapping);
    if (!resolved) {
      skippedRowCount++;
      continue;
    }

    rows.push({ date, description, amount: resolved.amount, type: resolved.type });
  }

  return { rows, skippedRowCount };
}

function resolveAmountAndType(
  raw: RawTableRow,
  mapping: StatementColumnMapping
): { amount: number; type: "income" | "expense" } | null {
  if (mapping.amountMode === "separate_debit_credit") {
    const debit = mapping.debitColumnIndex !== undefined ? parseFlexibleAmount(raw[mapping.debitColumnIndex]) : null;
    const credit = mapping.creditColumnIndex !== undefined ? parseFlexibleAmount(raw[mapping.creditColumnIndex]) : null;

    if (debit && debit > 0) return { amount: debit, type: "expense" };
    if (credit && credit > 0) return { amount: credit, type: "income" };
    return null;
  }

  if (mapping.amountMode === "single_with_type_column") {
    const amountRaw = mapping.amountColumnIndex !== undefined ? parseFlexibleAmount(raw[mapping.amountColumnIndex]) : null;
    if (amountRaw === null || amountRaw === 0) return null;

    const typeRaw = mapping.typeColumnIndex !== undefined ? raw[mapping.typeColumnIndex] : undefined;
    const type = normalizeTypeLabel(typeRaw);
    if (!type) return null;

    return { amount: Math.abs(amountRaw), type };
  }

  // single_signed
  const amountRaw = mapping.amountColumnIndex !== undefined ? parseFlexibleAmount(raw[mapping.amountColumnIndex]) : null;
  if (amountRaw === null || amountRaw === 0) return null;

  const positiveMeans = mapping.positiveMeans ?? "income";
  const isPositive = amountRaw > 0;
  const type: "income" | "expense" = isPositive ? positiveMeans : positiveMeans === "income" ? "expense" : "income";

  return { amount: Math.abs(amountRaw), type };
}

const INCOME_LABELS = /^(credit|cr|income|in|deposit)$/i;
const EXPENSE_LABELS = /^(debit|dr|expense|out|withdrawal)$/i;

function normalizeTypeLabel(value: unknown): "income" | "expense" | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (INCOME_LABELS.test(raw)) return "income";
  if (EXPENSE_LABELS.test(raw)) return "expense";
  return null;
}
