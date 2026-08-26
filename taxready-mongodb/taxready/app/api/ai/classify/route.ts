import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/monitoring";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai";
import { getCountryTaxConfig } from "@/lib/tax/country-rules";

// This route never trusts the client with the AI provider directly —
// Gemini API keys / Vertex credentials stay server-side (see section 25:
// "Never expose Gemini API keys or service credentials in frontend code").

const bodySchema = z.object({
  description: z.string().min(1),
  amount: z.number(),
  type: z.enum(["income", "expense"]),
  currency: z.string().default("NGN"),
  merchant: z.string().optional()
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
    const result = await provider.classifyTransaction(parsed.data, taxConfig);
    return NextResponse.json(result);
  } catch (err) {
    captureError("[api/ai/classify] failed", err);
    return NextResponse.json({ error: "Classification failed. Please try again." }, { status: 500 });
  }
}
