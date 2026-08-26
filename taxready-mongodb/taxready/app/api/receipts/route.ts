import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { captureError } from "@/lib/monitoring";
import { getAIProvider } from "@/lib/ai";
import { withRetry } from "@/lib/ai/retry";
import { getOrCreateBusinessForUser, insertReceipt, listReceipts } from "@/lib/db/repositories";
import { isAllowedReceiptMimeType, isReceiptBase64WithinSizeLimit, MAX_RECEIPT_FILE_MB } from "@/lib/validation/receipt";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
  const receipts = await listReceipts(business.id);
  return NextResponse.json({ receipts });
}

// `manual: true` is the fallback path for when AI extraction fails (see
// upload-receipt-modal.tsx) — the user types the receipt details in
// themselves instead of being stuck with no way to record it at all.
const manualFieldsSchema = z.object({
  merchant: z.string().optional(),
  date: z.string().optional(),
  amount: z.number().optional(),
  vatAmount: z.number().optional(),
  currency: z.string().optional(),
  category: z.string().optional(),
  paymentMethod: z.string().optional()
});

const bodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
  base64: z.string().optional(),
  storageUrl: z.string().optional(),
  manual: z.boolean().optional(),
  manualFields: manualFieldsSchema.optional()
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { fileName, mimeType, base64, storageUrl, manual, manualFields } = parsed.data;

  if (!manual) {
    if (!isAllowedReceiptMimeType(mimeType)) {
      return NextResponse.json(
        { error: "That file type isn't supported. Upload a JPG, PNG, WEBP, HEIC, or PDF." },
        { status: 400 }
      );
    }
    if (base64 && !isReceiptBase64WithinSizeLimit(base64)) {
      return NextResponse.json(
        { error: `That file is too large. Please upload a receipt under ${MAX_RECEIPT_FILE_MB}MB.` },
        { status: 413 }
      );
    }
  }

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");

  try {
    // Manual entry skips the AI provider entirely — the user is the
    // source of truth here, not an extraction to verify.
    const extraction = manual
      ? { ...manualFields, confidence: undefined }
      : await withRetry(async () => {
          const provider = await getAIProvider();
          return provider.extractReceipt({ fileName, mimeType, base64 });
        });

    const receipt = await insertReceipt(business.id, {
      businessId: business.id,
      fileName,
      merchant: extraction.merchant,
      date: extraction.date,
      amount: extraction.amount,
      vatAmount: extraction.vatAmount,
      currency: extraction.currency,
      category: extraction.category,
      paymentMethod: extraction.paymentMethod,
      aiConfidence: extraction.confidence,
      storageUrl,
      // Manual entries have no AI confidence behind them, so they're
      // flagged the same way a low-confidence extraction would be —
      // worth a human glance before it's treated as final.
      status: manual ? "needs_review" : "extracted",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json(receipt);
  } catch (err) {
    captureError("[api/receipts] failed", err);
    return NextResponse.json(
      { error: "We couldn't process this receipt. You can try again or enter it manually." },
      { status: 500 }
    );
  }
}
