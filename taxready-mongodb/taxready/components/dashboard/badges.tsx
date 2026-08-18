import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/types";

export function StatusBadge({ status }: { status: Transaction["status"] }) {
  if (status === "reviewed") return <Badge tone="success">Reviewed</Badge>;
  if (status === "flagged") return <Badge tone="warning">Flagged</Badge>;
  return <Badge tone="neutral">Pending</Badge>;
}

export function TaxRelevanceBadge({ relevance }: { relevance?: Transaction["taxRelevance"] }) {
  if (!relevance || relevance === "not_tax_relevant") return <span className="text-ink/35">—</span>;
  const label = relevance.replace(/_/g, " ");
  const tone = relevance === "needs_documentation" || relevance === "review_required" ? "warning" : "info";
  return <Badge tone={tone as "warning" | "info"}>{label}</Badge>;
}
