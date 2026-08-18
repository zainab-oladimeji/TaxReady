import { AIProvider, COMPLIANCE_DISCLAIMER } from "./provider";
import {
  Anomaly,
  ClassificationResult,
  FinancialContext,
  AIResponse,
  ReceiptExtraction,
  PeriodSummary,
  Transaction,
  CountryTaxConfig,
  TaxRelevance
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
