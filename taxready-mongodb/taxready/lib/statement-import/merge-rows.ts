import { NormalizedStatementRow } from "@/types";

/**
 * PDF text is chunked with a small overlap between consecutive chunks
 * (see chunkTextLines in pdf-reader.ts) so a transaction near a chunk
 * boundary isn't missed. That overlap means the same transaction can get
 * extracted twice — once from each of the two chunks that saw it. This
 * removes exact duplicates (same date + description + amount + type)
 * while leaving genuinely repeated transactions (e.g. two identical
 * ₦2,000 transfers on the same day) alone, since those are legitimate
 * and shouldn't be merged into one.
 *
 * "Exact duplicate" here means adjacent in the array — overlap can only
 * ever produce a duplicate from consecutive chunks, so two identical
 * transactions ten pages apart are correctly left as two rows.
 */
export function dedupeAdjacentStatementRows(rows: NormalizedStatementRow[]): NormalizedStatementRow[] {
  const result: NormalizedStatementRow[] = [];
  for (const row of rows) {
    const prev = result[result.length - 1];
    const isDuplicateOfPrev =
      prev && prev.date === row.date && prev.description === row.description && prev.amount === row.amount && prev.type === row.type;
    if (!isDuplicateOfPrev) result.push(row);
  }
  return result;
}
