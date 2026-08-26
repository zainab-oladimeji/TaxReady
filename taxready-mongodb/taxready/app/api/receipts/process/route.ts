import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/monitoring";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai";
import { withRetry } from "@/lib/ai/retry";
import { isAllowedReceiptMimeType, isReceiptBase64WithinSizeLimit, MAX_RECEIPT_FILE_MB } from "@/lib/validation/receipt";

// Production flow (see ARCHITECTURE.md): the client uploads the file directly
// to Cloud Storage via a signed URL, then calls this route with the storage
// path. This route reads the file server-side and passes it to Gemini —
// the file bytes never round-trip through this API body in production.
// For local/demo use we accept fileName + mimeType and let the provider
// (mock or Gemini) take it from there.

const bodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
  base64: z.string().optional()
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isAllowedReceiptMimeType(parsed.data.mimeType)) {
    return NextResponse.json(
      { error: "That file type isn't supported. Upload a JPG, PNG, WEBP, HEIC, or PDF." },
      { status: 400 }
    );
  }
  if (parsed.data.base64 && !isReceiptBase64WithinSizeLimit(parsed.data.base64)) {
    return NextResponse.json(
      { error: `That file is too large. Please upload a receipt under ${MAX_RECEIPT_FILE_MB}MB.` },
      { status: 413 }
    );
  }

  try {
    const extraction = await withRetry(async () => {
      const provider = await getAIProvider();
      return provider.extractReceipt(parsed.data);
    });
    return NextResponse.json(extraction);
  } catch (err) {
    captureError("[api/receipts/process] failed", err);
    return NextResponse.json({ error: "We couldn't process this receipt. Try again or enter it manually." }, { status: 500 });
  }
}
