import { parse, isValid, format } from "date-fns";

/**
 * Bank statement date cells arrive in a wide range of formats depending on
 * the bank and export type — "05 Jan 2026 12:53:05", "2026-01-05",
 * "05/01/2026", "01-05-2026", already-a-Date (from Excel serial dates
 * once xlsx.ts converts them), etc. Tries a fixed list of common formats
 * before falling back to native Date parsing, and always normalizes to
 * plain YYYY-MM-DD (time-of-day isn't used anywhere downstream — see
 * Transaction.date in types/index.ts).
 *
 * Returns null (never throws) so callers can skip an unparseable row and
 * report it in the import's warnings instead of failing the whole file.
 */
const CANDIDATE_FORMATS = [
  "dd MMM yyyy HH:mm:ss",
  "dd MMM yyyy",
  "d MMM yyyy",
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd",
  "dd/MM/yyyy HH:mm:ss",
  "dd/MM/yyyy",
  "MM/dd/yyyy HH:mm:ss",
  "MM/dd/yyyy",
  "dd-MM-yyyy",
  "MM-dd-yyyy",
  "MMM dd, yyyy",
  "MMMM dd, yyyy"
];

export function parseFlexibleDate(value: unknown, formatHint?: string): string | null {
  if (value instanceof Date) {
    return isValid(value) ? format(value, "yyyy-MM-dd") : null;
  }
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();
  if (raw === "") return null;

  const referenceDate = new Date();

  // A format hint from the AI's column detection goes first — it's often
  // right and saves cycling through every candidate.
  const formatsToTry = formatHint ? [formatHint, ...CANDIDATE_FORMATS] : CANDIDATE_FORMATS;

  for (const fmt of formatsToTry) {
    try {
      const parsed = parse(raw, fmt, referenceDate);
      if (isValid(parsed) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
        return format(parsed, "yyyy-MM-dd");
      }
    } catch {
      // Try the next format.
    }
  }

  // Last resort — native Date parsing handles a handful of common cases
  // (like ISO strings with a "Z" suffix) the formats above don't cover.
  const native = new Date(raw);
  if (isValid(native) && native.getFullYear() > 1990 && native.getFullYear() < 2100) {
    return format(native, "yyyy-MM-dd");
  }

  return null;
}
