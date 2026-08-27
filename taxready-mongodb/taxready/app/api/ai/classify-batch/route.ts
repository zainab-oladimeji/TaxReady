import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/monitoring";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai";
import { getCountryTaxConfig } from "@/lib/tax/country-rules";

// Batch counterpart to /api/ai/classify — used by demo-mode CSV imports
// (see components/providers/data-provider.tsx) so an N-row import costs
// one AI call instead of N. Never trusts the client with the AI provider
// directly; Gemini API keys stay server-side.

const bodySchema = z.object({
  transactions: z
    .array(
      z.object({
        description: z.string().min(1),
        amount: z.number(),
        type: z.enum(["income", "expense"]),
        currency: z.string().default("NGN"),
        merchant: z.string().optional()
      })
    )
    .min(1)
    .max(500)
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const provider = await getAIProvider();
    const taxConfig = getCountryTaxConfig("NG");
    const results = await provider.classifyTransactionsBatch(parsed.data.transactions, taxConfig);
    return NextResponse.json({ results });
  } catch (err) {
    captureError("[api/ai/classify-batch] failed", err);
    return NextResponse.json({ error: "Classification failed. Please try again." }, { status: 500 });
  }
}
