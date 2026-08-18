import { Business, Receipt, Transaction } from "@/types";

// Deterministic pseudo-random generator so the demo dataset is stable
// across reloads and across server/client renders (no hydration mismatch).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260818);

export const DEMO_BUSINESS: Business = {
  id: "biz-lagos-retail",
  ownerId: "demo-owner",
  name: "Lagos Retail Co.",
  type: "Retail",
  country: "NG",
  state: "Lagos",
  currency: "NGN",
  createdAt: "2026-01-08T09:00:00.000Z"
};

export const DEMO_ACCOUNTANT_CLIENTS = [
  { name: "Lagos Retail Co.", status: "Ready for review" as const },
  { name: "Zed Foods", status: "Needs attention" as const },
  { name: "Adeola Consulting", status: "Ready for review" as const },
  { name: "Zainab Fashion Ltd", status: "Missing records" as const },
  { name: "Zee Consulting", status: "Ready for review" as const }
];

const EXPENSE_MERCHANTS: { desc: string; category: string; range: [number, number] }[] = [
  { desc: "Shoprite - Inventory Restock", category: "Inventory", range: [20000, 180000] },
  { desc: "Office Rent - Ikeja Warehouse", category: "Rent", range: [350000, 350000] },
  { desc: "Ikeja Electric - Utility Bill", category: "Utilities", range: [15000, 65000] },
  { desc: "Staff Salary Payment", category: "Salaries", range: [90000, 420000] },
  { desc: "Bolt - Delivery Logistics", category: "Transportation", range: [2500, 18000] },
  { desc: "Instagram Ads - Product Promo", category: "Marketing", range: [10000, 75000] },
  { desc: "Google Workspace Subscription", category: "Software", range: [8000, 22000] },
  { desc: "ABC Office Supplies", category: "Office Supplies", range: [12000, 95000] },
  { desc: "Adeola & Co. Accounting Fee", category: "Professional Services", range: [50000, 150000] },
  { desc: "GTBank - Transfer Fee", category: "Banking Fees", range: [50, 5000] },
  { desc: "Total Filling Station - Fuel", category: "Transportation", range: [15000, 40000] },
  { desc: "Jumia Business - Packaging", category: "Office Supplies", range: [8000, 30000] }
];

const INCOME_SOURCES: { desc: string; category: string; range: [number, number] }[] = [
  { desc: "POS Payment Received - Retail Sale", category: "Sales", range: [5000, 250000] },
  { desc: "Client Payment - Bulk Order", category: "Sales", range: [80000, 900000] },
  { desc: "Service Fee - Delivery Partner", category: "Service Revenue", range: [10000, 60000] },
  { desc: "Wholesale Order Payment", category: "Sales", range: [150000, 1200000] }
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function amountIn([min, max]: [number, number]): number {
  return Math.round((min + rand() * (max - min)) / 50) * 50;
}

function dateWithinLast(days: number): string {
  const now = new Date("2026-08-18T12:00:00.000Z");
  const d = new Date(now.getTime() - Math.floor(rand() * days) * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

const TOTAL_TRANSACTIONS = 1248;
const TARGET_REVENUE = 24_850_000;
const TARGET_EXPENSES = 12_420_000;
const RECEIPT_COUNT = 438;
const NEEDS_REVIEW_COUNT = 66;

function generateTransactions(): Transaction[] {
  const incomeCount = Math.round(TOTAL_TRANSACTIONS * 0.3);
  const expenseCount = TOTAL_TRANSACTIONS - incomeCount;
  const txns: Transaction[] = [];

  let runningRevenue = 0;
  for (let i = 0; i < incomeCount; i++) {
    const src = pick(INCOME_SOURCES);
    let amount = amountIn(src.range);
    if (i === incomeCount - 1) amount = Math.max(1000, TARGET_REVENUE - runningRevenue);
    runningRevenue += amount;
    const flagged = i < NEEDS_REVIEW_COUNT * 0.4;
    txns.push(makeTxn(i, "income", src.desc, src.category, amount, flagged));
  }

  let runningExpenses = 0;
  for (let i = 0; i < expenseCount; i++) {
    const src = pick(EXPENSE_MERCHANTS);
    let amount = amountIn(src.range);
    if (i === expenseCount - 1) amount = Math.max(500, TARGET_EXPENSES - runningExpenses);
    runningExpenses += amount;
    const flagged = i >= expenseCount - Math.ceil(NEEDS_REVIEW_COUNT * 0.6) && i < expenseCount - Math.ceil(NEEDS_REVIEW_COUNT * 0.6) + NEEDS_REVIEW_COUNT * 0.6;
    txns.push(makeTxn(incomeCount + i, "expense", src.desc, src.category, amount, flagged));
  }

  return txns.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function makeTxn(
  index: number,
  type: "income" | "expense",
  description: string,
  category: string,
  amount: number,
  needsReview: boolean
): Transaction {
  const confidence = needsReview ? 0.55 + rand() * 0.19 : 0.8 + rand() * 0.19;
  const hasReceipt = type === "expense" && index % 3 !== 0;
  return {
    id: `txn-${index.toString().padStart(5, "0")}`,
    businessId: DEMO_BUSINESS.id,
    date: dateWithinLast(180),
    description,
    merchant: description.split(" - ")[0],
    amount,
    currency: "NGN",
    type,
    category,
    taxRelevance:
      category === "Sales" || category === "Service Revenue"
        ? "vat_related"
        : category === "Salaries" || category === "Professional Services"
        ? "withholding_tax_related"
        : needsReview
        ? "needs_documentation"
        : "potentially_deductible",
    aiConfidence: Math.round(confidence * 100) / 100,
    aiReason: needsReview
      ? "Description text was ambiguous — please confirm the category."
      : `Matched pattern typical of "${category}" transactions.`,
    receiptId: hasReceipt ? `rcpt-${index.toString().padStart(5, "0")}` : undefined,
    status: needsReview ? "flagged" : rand() > 0.5 ? "reviewed" : "pending",
    createdAt: dateWithinLast(180) + "T09:00:00.000Z",
    updatedAt: dateWithinLast(30) + "T09:00:00.000Z"
  };
}

function generateReceipts(transactions: Transaction[]): Receipt[] {
  const withReceipt = transactions.filter((t) => t.receiptId);
  const receipts: Receipt[] = withReceipt.slice(0, RECEIPT_COUNT).map((t, i) => ({
    id: t.receiptId!,
    businessId: DEMO_BUSINESS.id,
    fileName: `receipt-${(i + 1).toString().padStart(4, "0")}.jpg`,
    merchant: t.merchant,
    date: t.date,
    amount: t.amount,
    vatAmount: Math.round(t.amount * 0.075 * 100) / 100,
    currency: "NGN",
    category: t.category,
    paymentMethod: rand() > 0.5 ? "Card" : "Transfer",
    aiConfidence: t.aiConfidence,
    transactionId: t.id,
    status: "matched",
    createdAt: t.date + "T10:00:00.000Z"
  }));
  return receipts;
}

export const DEMO_TRANSACTIONS: Transaction[] = generateTransactions();
export const DEMO_RECEIPTS: Receipt[] = generateReceipts(DEMO_TRANSACTIONS);

export const DEMO_TOTALS = {
  totalRevenue: DEMO_TRANSACTIONS.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0),
  totalExpenses: DEMO_TRANSACTIONS.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0),
  transactionCount: DEMO_TRANSACTIONS.length,
  uncategorizedCount: DEMO_TRANSACTIONS.filter((t) => t.status === "pending").length,
  receiptCount: DEMO_RECEIPTS.length,
  needsReviewCount: DEMO_TRANSACTIONS.filter((t) => t.status === "flagged").length
};
