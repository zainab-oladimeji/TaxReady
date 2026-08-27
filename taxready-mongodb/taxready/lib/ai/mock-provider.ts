import { AIProvider, COMPLIANCE_DISCLAIMER } from "./provider";
import { parseFlexibleDate } from "@/lib/statement-import/parse-date";
import {
  Anomaly,
  ClassificationResult,
  FinancialContext,
  AIResponse,
  ReceiptExtraction,
  PeriodSummary,
  Transaction,
  CountryTaxConfig,
  TaxRelevance,
  StatementColumnMapping,
  NormalizedStatementRow
} from "@/types";

// Keyword rules used only to make the offline demo feel intelligent and
// consistent. This is NOT a tax rules engine — it never asserts a
// definitive tax outcome, only a category + a review flag, exactly like
// the real Gemini path is required to.
const KEYWORD_RULES: { pattern: RegExp; category: string; subcategory?: string; taxRelevance: TaxRelevance }[] = [
  { pattern: /shoprite|market|foodco|grocer/i, category: "Inventory", subcategory: "Supplies", taxRelevance: "potentially_deductible" },
  { pattern: /rent|landlord|lease/i, category: "Rent", taxRelevance: "potentially_deductible" },
  { pattern: /phcn|ikeja electric|nepa|electric|water corp/i, category: "Utilities", taxRelevance: "potentially_deductible" },
  { pattern: /salary|payroll|wages/i, category: "Salaries", taxRelevance: "withholding_tax_related" },
  { pattern: /uber|bolt|fuel|transport|diesel/i, category: "Transportation", taxRelevance: "potentially_deductible" },
  { pattern: /facebook ads|instagram|google ads|marketing|billboard/i, category: "Marketing", taxRelevance: "potentially_deductible" },
  { pattern: /aws|google cloud|figma|notion|software|subscription|saas/i, category: "Software", taxRelevance: "vat_related" },
  { pattern: /office|stationery|printer|supplies/i, category: "Office Supplies", taxRelevance: "potentially_deductible" },
  { pattern: /accountant|lawyer|consult|legal/i, category: "Professional Services", taxRelevance: "withholding_tax_related" },
  { pattern: /bank charge|transfer fee|pos fee|maintenance fee/i, category: "Banking Fees", taxRelevance: "not_tax_relevant" },
  { pattern: /client payment|invoice paid|sales|pos payment received/i, category: "Sales", taxRelevance: "vat_related" },
  { pattern: /service fee|consulting income|retainer/i, category: "Service Revenue", taxRelevance: "vat_related" }
];

function hashConfidence(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000;
  return 0.72 + (h % 24) / 100; // 0.72 - 0.95, deterministic per input
}

export class MockAIProvider implements AIProvider {
  readonly name = "mock" as const;

  async classifyTransaction(
    transaction: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">,
    _taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult> {
    const haystack = `${transaction.merchant ?? ""} ${transaction.description}`;
    const rule = KEYWORD_RULES.find((r) => r.pattern.test(haystack));
    const confidence = hashConfidence(haystack + transaction.amount);

    if (transaction.type === "income" && !rule) {
      return {
        category: "Other Income",
        taxRelevance: "review_required",
        confidence: 0.68,
        reason: "Income transaction did not match a known revenue pattern; flagged for manual review.",
        requiresReview: true
      };
    }

    if (!rule) {
      return {
        category: "Other Business Expenses",
        taxRelevance: "needs_documentation",
        confidence: 0.6,
        reason: "No confident category match from the description alone. A receipt or more detail would improve accuracy.",
        requiresReview: true
      };
    }

    return {
      category: rule.category,
      subcategory: rule.subcategory,
      taxRelevance: rule.taxRelevance,
      confidence,
      reason: `Matched pattern typical of "${rule.category}" transactions based on the description text.`,
      requiresReview: confidence < 0.8
    };
  }

  async classifyTransactionsBatch(
    transactions: Pick<Transaction, "description" | "amount" | "type" | "currency" | "merchant">[],
    taxConfig: CountryTaxConfig
  ): Promise<ClassificationResult[]> {
    // Mock mode runs fully offline with no API quota to conserve, so a
    // simple loop over the existing per-row logic is fine here — the
    // batching optimization only matters for the real Gemini providers.
    return Promise.all(transactions.map((t) => this.classifyTransaction(t, taxConfig)));
  }

  async extractReceipt(input: { fileName: string; mimeType: string }): Promise<ReceiptExtraction> {
    // Deterministic pseudo-extraction so repeated demo uploads behave consistently.
    const seed = input.fileName.length + input.fileName.charCodeAt(0);
    const merchants = ["ABC Office Supplies", "Shoprite", "Total Filling Station", "Jumia Business", "Konga Stores"];
    const merchant = merchants[seed % merchants.length];
    const amount = 15000 + (seed * 733) % 90000;
    const vatAmount = Math.round(amount * 0.075 * 100) / 100;

    return {
      merchant,
      date: new Date().toISOString().slice(0, 10),
      amount,
      vatAmount,
      currency: "NGN",
      category: "Office Supplies",
      paymentMethod: seed % 2 === 0 ? "Card" : "Transfer",
      confidence: hashConfidence(input.fileName)
    };
  }

  async detectStatementColumns(
    sampleRows: (string | number | null | undefined)[][],
    _context: { fileName: string; sheetName?: string }
  ): Promise<StatementColumnMapping> {
    // Offline heuristic so the demo/mock path can still exercise the
    // statement-import feature without any AI credentials: scan the first
    // handful of rows for one that looks like a header (cells matching
    // known column-name keywords), then map by keyword. This is
    // deliberately simple — it's the same role a real AI call plays for
    // detectStatementColumns, just rule-based instead of model-based, and
    // only used when no GROQ_API_KEY/GEMINI credentials are configured.
    const maxScanRows = Math.min(sampleRows.length, 15);

    for (let i = 0; i < maxScanRows; i++) {
      const row = sampleRows[i].map((c) => String(c ?? "").toLowerCase().trim());

      const dateIdx = row.findIndex((c) => /date/.test(c));
      const descIdx = row.findIndex((c) => /description|narration|details|memo/.test(c));
      const debitIdx = row.findIndex((c) => /debit/.test(c));
      const creditIdx = row.findIndex((c) => /credit/.test(c));
      const amountIdx = row.findIndex((c) => /^amount$/.test(c) || /amount/.test(c));
      const typeIdx = row.findIndex((c) => /^type$/.test(c) || /dr\/cr|drcr/.test(c));

      if (dateIdx === -1 || descIdx === -1) continue;

      if (debitIdx !== -1 && creditIdx !== -1) {
        return {
          dataStartRowIndex: i + 1,
          dateColumnIndex: dateIdx,
          descriptionColumnIndex: descIdx,
          amountMode: "separate_debit_credit",
          debitColumnIndex: debitIdx,
          creditColumnIndex: creditIdx,
          confidence: 0.8,
          notes: "Detected via mock provider's keyword heuristic (no live AI credentials configured)."
        };
      }

      if (amountIdx !== -1 && typeIdx !== -1) {
        return {
          dataStartRowIndex: i + 1,
          dateColumnIndex: dateIdx,
          descriptionColumnIndex: descIdx,
          amountMode: "single_with_type_column",
          amountColumnIndex: amountIdx,
          typeColumnIndex: typeIdx,
          confidence: 0.8,
          notes: "Detected via mock provider's keyword heuristic (no live AI credentials configured)."
        };
      }

      if (amountIdx !== -1) {
        return {
          dataStartRowIndex: i + 1,
          dateColumnIndex: dateIdx,
          descriptionColumnIndex: descIdx,
          amountMode: "single_signed",
          amountColumnIndex: amountIdx,
          positiveMeans: "income",
          confidence: 0.6,
          notes: "Detected via mock provider's keyword heuristic (no live AI credentials configured)."
        };
      }
    }

    // Fall back to the standard shape this app's own CSV template uses
    // (date, description, amount, type) — see components/dashboard/
    // import-csv-modal.tsx's hint text — rather than failing outright.
    return {
      dataStartRowIndex: 1,
      dateColumnIndex: 0,
      descriptionColumnIndex: 1,
      amountMode: "single_with_type_column",
      amountColumnIndex: 2,
      typeColumnIndex: 3,
      confidence: 0.3,
      notes: "No recognizable header found — assumed the standard date/description/amount/type layout."
    };
  }

  async extractStatementTransactionsFromText(
    textChunk: string,
    _context: { fileName: string }
  ): Promise<NormalizedStatementRow[]> {
    // Offline heuristic: look for lines containing both a date-like token
    // and a number, and take the largest number on the line as the
    // amount. Good enough to exercise the PDF-import UI/pipeline in
    // demo/mock mode — not intended to be as accurate as the real
    // AI-backed extraction.
    const rows: NormalizedStatementRow[] = [];
    const dateToken = /\b(\d{1,2}[\/\-\s][A-Za-z]{3,9}[\/\-\s]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/;
    const amountToken = /-?\d[\d,]*\.\d{2}/g;

    for (const line of textChunk.split("\n")) {
      const dateMatch = line.match(dateToken);
      if (!dateMatch) continue;

      const amounts = [...line.matchAll(amountToken)].map((m) => m[0]);
      if (amounts.length === 0) continue;

      const lastAmountRaw = amounts[amounts.length - 1];
      const amount = Math.abs(Number.parseFloat(lastAmountRaw.replace(/,/g, "")));
      if (!Number.isFinite(amount) || amount === 0) continue;

      const description = line.replace(dateMatch[0], "").replace(lastAmountRaw, "").trim().replace(/\s{2,}/g, " ");
      if (!description) continue;

      const date = parseFlexibleDate(dateMatch[0]);
      if (!date) continue;

      rows.push({
        date,
        description,
        amount,
        type: lastAmountRaw.trim().startsWith("-") ? "expense" : "income"
      });
    }

    return rows;
  }

  async summarizePeriod(context: FinancialContext, periodLabel: string): Promise<PeriodSummary> {
    const { transactions } = context;
    const totalRevenue = sum(transactions.filter((t) => t.type === "income").map((t) => t.amount));
    const totalExpenses = sum(transactions.filter((t) => t.type === "expense").map((t) => t.amount));
    const categorized = transactions.filter((t) => t.status !== "pending").length;
    const needsReview = transactions.filter((t) => t.status === "flagged" || (t.aiConfidence ?? 1) < 0.75).length;

    return {
      periodLabel,
      totalRevenue,
      totalExpenses,
      netPosition: totalRevenue - totalExpenses,
      transactionCount: transactions.length,
      categorizedCount: categorized,
      needsReviewCount: needsReview,
      narrative:
        `During ${periodLabel}, ${transactions.length} transactions were recorded, totaling ` +
        `${formatMoney(totalRevenue)} in revenue and ${formatMoney(totalExpenses)} in expenses. ` +
        `${needsReview} transaction${needsReview === 1 ? "" : "s"} still need${needsReview === 1 ? "s" : ""} review before this period is accountant-ready.`
    };
  }

  async detectAnomalies(context: FinancialContext): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    for (const t of context.transactions) {
      if (!t.receiptId && t.type === "expense" && t.amount > 50000) {
        anomalies.push({
          transactionId: t.id,
          reason: `Expense of ${formatMoney(t.amount)} has no attached receipt.`,
          severity: t.amount > 150000 ? "high" : "medium"
        });
      }
      if ((t.aiConfidence ?? 1) < 0.65) {
        anomalies.push({
          transactionId: t.id,
          reason: "AI classification confidence is low; category may be incorrect.",
          severity: "low"
        });
      }
    }
    return anomalies;
  }

  async answerQuestion(question: string, context: FinancialContext): Promise<AIResponse> {
    const q = question.toLowerCase();
    const { transactions } = context;

    if (/legal|advice|liability|owe|penalt/.test(q)) {
      return { answer: COMPLIANCE_DISCLAIMER, disclaimer: COMPLIANCE_DISCLAIMER };
    }

    if (/uncategoriz/.test(q)) {
      const list = transactions.filter((t) => t.status === "pending");
      return {
        answer: `You have ${list.length} uncategorized transaction${list.length === 1 ? "" : "s"} totaling ${formatMoney(sum(list.map((t) => t.amount)))}.`,
        citedTransactionIds: list.slice(0, 10).map((t) => t.id)
      };
    }

    if (/receipt/.test(q) && /need|missing|without/.test(q)) {
      const list = transactions.filter((t) => t.type === "expense" && !t.receiptId);
      return {
        answer: `${list.length} expense transaction${list.length === 1 ? "" : "s"} don't have a receipt attached yet.`,
        citedTransactionIds: list.slice(0, 10).map((t) => t.id)
      };
    }

    if (/largest|biggest|top/.test(q) && /categor/.test(q)) {
      const totals = new Map<string, number>();
      for (const t of transactions.filter((t) => t.type === "expense")) {
        totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
      }
      const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      return {
        answer: top.map(([cat, amt], i) => `${i + 1}. ${cat} — ${formatMoney(amt)}`).join("\n") || "No expense data yet."
      };
    }

    if (/how much.*spend|expenses this month|total expense/.test(q)) {
      const total = sum(transactions.filter((t) => t.type === "expense").map((t) => t.amount));
      return { answer: `Total business expenses recorded: ${formatMoney(total)} across ${transactions.length} transactions.` };
    }

    if (/summary|accountant/.test(q)) {
      return {
        answer:
          "I can prepare an Accountant Review Pack from your Reports tab — it bundles your categorized transactions, flagged items, missing documents, and AI notes into one export.",
      };
    }

    return {
      answer:
        "I can answer questions about your own transactions, receipts, and categories — try asking about uncategorized transactions, missing receipts, or your largest expense categories.",
    };
  }
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function formatMoney(n: number): string {
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
