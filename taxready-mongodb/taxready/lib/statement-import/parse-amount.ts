/**
 * Bank statement amount cells show up in a lot of shapes across banks and
 * export formats: "45,500.00", "₦2,390.96", "(1,200.00)" for a negative,
 * "--" or "-" as a placeholder for "no value in this column", or already
 * a plain number if the source was JSON/Excel with numeric cells.
 *
 * Returns null for anything that isn't a real amount (blank, placeholder,
 * unparseable) — callers treat null as "this column has no value here",
 * which matters for separate debit/credit columns where exactly one of
 * the two is expected to be empty per row.
 */
export function parseFlexibleAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const raw = String(value).trim();
  if (raw === "" || raw === "-" || raw === "--" || /^n\/?a$/i.test(raw)) return null;

  // Parenthesized amounts are a common negative-number convention in
  // financial exports, e.g. "(1,200.00)" means -1200.00.
  const isParenNegative = /^\(.*\)$/.test(raw);
  const stripped = raw
    .replace(/[()]/g, "")
    .replace(/[₦$€£,\s]/g, "")
    .replace(/^NGN|^USD|^GBP|^EUR/i, "");

  const num = Number.parseFloat(stripped);
  if (Number.isNaN(num)) return null;

  return isParenNegative ? -Math.abs(num) : num;
}
