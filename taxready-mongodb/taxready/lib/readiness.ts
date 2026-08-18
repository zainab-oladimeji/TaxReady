import { ReadinessBreakdown, Receipt, Transaction } from "@/types";

/**
 * "Record readiness" — deliberately not "tax compliance". See ARCHITECTURE.md
 * and the disclaimer copy used everywhere this score is displayed:
 * TaxReady prepares and organizes business records. It does not determine
 * or guarantee legal tax compliance.
 */
export function calculateReadiness(transactions: Transaction[], receipts: Receipt[]): ReadinessBreakdown {
  if (transactions.length === 0) {
    return {
      score: 0,
      label: "Not started",
      checks: [
        { label: "Transactions categorized", passed: false, detail: "No transactions imported yet." },
        { label: "Receipts attached", passed: false, detail: "No receipts uploaded yet." },
        { label: "Missing documentation", passed: false, detail: "N/A" },
        { label: "Uncategorized transactions", passed: false, detail: "N/A" },
        { label: "Tax-period review", passed: false, detail: "N/A" }
      ]
    };
  }

  const categorized = transactions.filter((t) => t.status !== "pending").length;
  const categorizedRatio = categorized / transactions.length;

  const expensesOver50k = transactions.filter((t) => t.type === "expense" && t.amount > 50000);
  const expensesWithReceipt = expensesOver50k.filter((t) => t.receiptId);
  const receiptRatio = expensesOver50k.length === 0 ? 1 : expensesWithReceipt.length / expensesOver50k.length;

  const uncategorized = transactions.filter((t) => t.status === "pending").length;
  const flagged = transactions.filter((t) => t.status === "flagged").length;
  const reviewed = transactions.filter((t) => t.status === "reviewed").length;
  const reviewRatio = reviewed / transactions.length;

  const weights = { categorized: 0.35, receipts: 0.25, uncategorized: 0.2, review: 0.2 };
  const uncategorizedScore = 1 - uncategorized / transactions.length;

  const score = Math.round(
    (categorizedRatio * weights.categorized +
      receiptRatio * weights.receipts +
      uncategorizedScore * weights.uncategorized +
      reviewRatio * weights.review) *
      100
  );

  return {
    score,
    label: score >= 80 ? "Strong progress" : score >= 55 ? "Needs attention" : "Just getting started",
    checks: [
      {
        label: "Transactions categorized",
        passed: categorizedRatio > 0.9,
        detail: `${categorized} of ${transactions.length} transactions categorized.`
      },
      {
        label: "Receipts attached",
        passed: receiptRatio > 0.85,
        detail: `${expensesWithReceipt.length} of ${expensesOver50k.length} large expenses have a receipt.`
      },
      {
        label: "Missing documentation",
        passed: flagged === 0,
        detail: `${flagged} transaction${flagged === 1 ? "" : "s"} flagged for missing documentation.`
      },
      {
        label: "Uncategorized transactions",
        passed: uncategorized === 0,
        detail: `${uncategorized} transaction${uncategorized === 1 ? "" : "s"} still uncategorized.`
      },
      {
        label: "Tax-period review",
        passed: reviewRatio > 0.8,
        detail: `${reviewed} of ${transactions.length} transactions marked reviewed.`
      }
    ]
  };
}
