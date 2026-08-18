import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getAIProvider } from "@/lib/ai";
import { getOrCreateBusinessForUser, insertReceipt, listReceipts } from "@/lib/db/repositories";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
  const receipts = await listReceipts(business.id);
  return NextResponse.json({ receipts });
}

const bodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
  base64: z.string().optional(),
  storageUrl: z.string().optional()
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
  const provider = await getAIProvider();
  const extraction = await provider.extractReceipt(parsed.data);

  const receipt = await insertReceipt(business.id, {
    businessId: business.id,
    fileName: parsed.data.fileName,
    merchant: extraction.merchant,
    date: extraction.date,
    amount: extraction.amount,
    vatAmount: extraction.vatAmount,
    currency: extraction.currency,
    category: extraction.category,
    paymentMethod: extraction.paymentMethod,
    aiConfidence: extraction.confidence,
    storageUrl: parsed.data.storageUrl,
    status: "extracted",
    createdAt: new Date().toISOString()
  });

  return NextResponse.json(receipt);
}
