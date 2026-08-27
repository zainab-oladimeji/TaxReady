import { describe, expect, it } from "vitest";
import { classifyInRobustBatches } from "@/lib/ai/robust-batch";
import { ClassificationResult } from "@/types";

const txn = (i: number) => ({
  description: `Transaction ${i}`,
  amount: 1000 + i,
  type: (i % 2 === 0 ? "expense" : "income") as "expense" | "income",
  currency: "NGN"
});

const okResult = (i: number): ClassificationResult => ({
  category: "Test",
  taxRelevance: "not_tax_relevant",
  confidence: 0.9,
  reason: `ok ${i}`,
  requiresReview: false
});

describe("classifyInRobustBatches", () => {
  it("returns one result per transaction, in order, for a clean provider", async () => {
    const transactions = Array.from({ length: 47 }, (_, i) => txn(i));
    const results = await classifyInRobustBatches(transactions, async (batch) => batch.map((t) => okResult(Number(t.description.split(" ")[1]))));
    expect(results).toHaveLength(47);
    expect(results.map((r) => r.reason)).toEqual(transactions.map((t) => `ok ${t.description.split(" ")[1]}`));
  });

  it("recovers when a specific chunk always comes back misaligned (simulating the reported bug)", async () => {
    // 50 transactions in one call previously triggered "Groq returned 40 for 50".
    // Simulate a provider that drops results whenever a batch is >= 20 long.
    const transactions = Array.from({ length: 50 }, (_, i) => txn(i));

    const rawBatchCall = async (batch: typeof transactions) => {
      if (batch.length >= 20) {
        // Simulate the model truncating output — return fewer results than input.
        return batch.slice(0, batch.length - 10).map((t) => okResult(Number(t.description.split(" ")[1])));
      }
      return batch.map((t) => okResult(Number(t.description.split(" ")[1])));
    };

    const results = await classifyInRobustBatches(transactions, rawBatchCall);
    expect(results).toHaveLength(50);
  });

  it("falls back to a flagged review result instead of throwing when a single transaction never classifies", async () => {
    const transactions = [txn(0), txn(1), txn(2)];
    const rawBatchCall = async (batch: typeof transactions) => {
      // Transaction 1 can never be classified; everything else works fine.
      if (batch.some((t) => t.description === "Transaction 1")) {
        throw new Error("simulated persistent failure");
      }
      return batch.map((t) => okResult(Number(t.description.split(" ")[1])));
    };

    const results = await classifyInRobustBatches(transactions, rawBatchCall);
    expect(results).toHaveLength(3);
    expect(results[1].requiresReview).toBe(true);
    expect(results[1].category).toBe("Uncategorized");
    // The transactions that could classify are unaffected.
    expect(results[0].requiresReview).toBe(false);
    expect(results[2].requiresReview).toBe(false);
  });

  it("returns an empty array for an empty input without calling the provider", async () => {
    let called = false;
    const results = await classifyInRobustBatches([], async () => {
      called = true;
      return [];
    });
    expect(results).toEqual([]);
    expect(called).toBe(false);
  });
});
