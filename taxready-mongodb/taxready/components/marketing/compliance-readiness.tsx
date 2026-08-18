import { Card, CardContent } from "@/components/ui/card";
import { ReadinessRing } from "@/components/ui/readiness-ring";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const CHECKS = [
  { label: "Transactions categorized", passed: true },
  { label: "Receipts attached", passed: true },
  { label: "Missing documentation", passed: false },
  { label: "Uncategorized transactions", passed: false },
  { label: "Tax-period review", passed: true }
];

export function ComplianceReadinessSection() {
  return (
    <section id="readiness" className="border-b border-line/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Compliance Readiness Score</p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">
              Know exactly how prepared your records are.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-ink/65">
              A single, explainable score built from five checks — not a black box, and not a compliance
              guarantee.
            </p>
            <p className="mt-5 max-w-md rounded-lg border border-clay/30 bg-clay/10 p-4 text-xs leading-relaxed text-alert">
              TaxReady prepares and organizes business records. It does not provide legal or tax advice and
              does not replace a qualified tax professional.
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <ReadinessRing
                score={82}
                size={168}
                label="Strong progress"
                segments={[
                  { label: "Categorized", value: 0.4, color: "#1F8F5F" },
                  { label: "Receipts", value: 0.25, color: "#4CAE7F" },
                  { label: "Reviewed", value: 0.17, color: "#AEDCC1" }
                ]}
              />
              <ul className="flex-1 space-y-2.5 text-sm">
                {CHECKS.map((c) => (
                  <li key={c.label} className="flex items-center gap-2">
                    {c.passed ? (
                      <CheckCircle2 size={15} className="shrink-0 text-brand-500" />
                    ) : (
                      <AlertTriangle size={15} className="shrink-0 text-alert" />
                    )}
                    <span className={c.passed ? "text-ink/75" : "text-ink/75"}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
