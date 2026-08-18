import { describe, it, expect } from "vitest";
import { MockAIProvider } from "@/lib/ai/mock-provider";
import { getCountryTaxConfig } from "@/lib/tax/country-rules";

const provider = new MockAIProvider();
const nigeria = getCountryTaxConfig("NG");

describe("MockAIProvider.classifyTransaction", () => {
  it("classifies a known expense pattern with a reason and confidence", async () => {
    const result = await provider.classifyTransaction(
      { description: "Office Rent - Ikeja Warehouse", amount: 350000, type: "expense", currency: "NGN" },
      nigeria
    );
    expect(result.category).toBe("Rent");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("flags unmatched income for review rather than guessing", async () => {
    const result = await provider.classifyTransaction(
      { description: "Unrecognized transfer XYZ123", amount: 5000, type: "income", currency: "NGN" },
      nigeria
    );
    expect(result.requiresReview).toBe(true);
  });

  it("never returns a confidence outside 0-1", async () => {
    const result = await provider.classifyTransaction(
      { description: "Shoprite - Inventory Restock", amount: 45000, type: "expense", currency: "NGN" },
      nigeria
    );
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe("MockAIProvider.answerQuestion", () => {
  it("returns the compliance disclaimer for legal/tax-advice questions", async () => {
    const result = await provider.answerQuestion("What is my tax liability this year?", {
      businessId: "b1",
      transactions: [],
      receipts: []
    });
    expect(result.answer).toMatch(/qualified tax professional/i);
  });
});
