/**
 * Shared between the client (import-csv-modal.tsx, fails fast before even
 * reading the file) and app/api/transactions/parse-statement/route.ts
 * (the actual enforcement point — client checks can always be bypassed by
 * calling the API directly).
 */

export const ALLOWED_STATEMENT_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/pdf"
];

// A bank statement can legitimately be much bigger than a receipt photo —
// a year of transactions across two accounts easily runs several thousand
// rows / dozens of PDF pages. 20MB raw stays comfortably under Vercel's
// request body limits once base64-encoded (~27MB) and is generous for
// realistic exports without being so high it invites accidental huge
// uploads with no clear error message.
export const MAX_STATEMENT_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_STATEMENT_BASE64_CHARS = Math.ceil((MAX_STATEMENT_FILE_BYTES * 4) / 3) + 100;

export function isAllowedStatementMimeType(mimeType: string): boolean {
  return ALLOWED_STATEMENT_MIME_TYPES.includes(mimeType.toLowerCase());
}

export function isStatementBase64WithinSizeLimit(base64: string): boolean {
  return base64.length <= MAX_STATEMENT_BASE64_CHARS;
}

export const MAX_STATEMENT_FILE_MB = Math.round(MAX_STATEMENT_FILE_BYTES / (1024 * 1024));
