/**
 * Shared between the client (upload-receipt-modal.tsx, fails fast before
 * even reading the file) and both server routes (/api/receipts,
 * /api/receipts/process — the actual enforcement point, since client-side
 * checks can always be bypassed by calling the API directly).
 */

export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
];

// Vercel Serverless Functions cap request bodies at a few MB depending on
// plan — well under that ceiling is where problems start regardless (a
// slow client upload, a provider timeout on a huge image). 6MB of raw
// file becomes ~8MB once base64-encoded (base64 is ~4/3 the size of the
// original bytes) — generous for a phone photo of a receipt, small enough
// to fail fast with a clear message instead of a mysterious platform-level
// rejection.
export const MAX_RECEIPT_FILE_BYTES = 6 * 1024 * 1024;
export const MAX_RECEIPT_BASE64_CHARS = Math.ceil((MAX_RECEIPT_FILE_BYTES * 4) / 3) + 100;

export function isAllowedReceiptMimeType(mimeType: string): boolean {
  return ALLOWED_RECEIPT_MIME_TYPES.includes(mimeType.toLowerCase());
}

export function isReceiptBase64WithinSizeLimit(base64: string): boolean {
  return base64.length <= MAX_RECEIPT_BASE64_CHARS;
}

export const MAX_RECEIPT_FILE_MB = Math.round(MAX_RECEIPT_FILE_BYTES / (1024 * 1024));
