import { describe, it, expect } from "vitest";
import { calculateReadiness } from "@/lib/readiness";
import { Transaction, Receipt } from "@/types";

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    businessId: "b1",
    date: "2026-08-01",
    description: "Test",
    amount: 10000,
    currency: "NGN",
    type: "expense",
    category: "Office Supplies",
    status: "reviewed",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides
  };
}

describe("calculateReadiness", () => {
  it("returns a zero score with no transactions", () => {
    const result = calculateReadiness([], []);
    expect(result.score).toBe(0);
    expect(result.label).toBe("Not started");
  });

  it("scores higher when transactions are categorized and reviewed with receipts", () => {
    const transactions: Transaction[] = [
      txn({ id: "t1", status: "reviewed", receiptId: "r1", amount: 60000 }),
      txn({ id: "t2", status: "reviewed", receiptId: "r2", amount: 60000 })
    ];
    const receipts: Receipt[] = [];
    const result = calculateReadiness(transactions, receipts);
    expect(result.score).toBeGreaterThan(50);
  });

  it("penalizes uncategorized and flagged transactions", () => {
    const transactions: Transaction[] = [
      txn({ id: "t1", status: "pending" }),
      txn({ id: "t2", status: "flagged" })
    ];
    const result = calculateReadiness(transactions, []);
    expect(result.score).toBeLessThan(60);
    const flaggedCheck = result.checks.find((c) => c.label === "Missing documentation");
    expect(flaggedCheck?.passed).toBe(false);
  });
});
