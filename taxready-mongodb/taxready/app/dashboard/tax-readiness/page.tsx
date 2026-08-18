"use client";

import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { ReadinessRing } from "@/components/ui/readiness-ring";
import { useTaxReadyData } from "@/components/providers/data-provider";
import { getCountryTaxConfig } from "@/lib/tax/country-rules";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function TaxReadinessPage() {
  const { readiness, business } = useTaxReadyData();
  const taxConfig = getCountryTaxConfig(business.country);

  return (
    <>
      <Topbar title="Tax Readiness" />
      <div className="space-y-6 p-5 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <ReadinessRing
                score={readiness.score}
                size={190}
                label={readiness.label}
                segments={[
                  { label: "Categorized", value: 0.4, color: "#1F8F5F" },
                  { label: "Receipts", value: 0.25, color: "#4CAE7F" },
                  { label: "Reviewed", value: 0.17, color: "#AEDCC1" }
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="font-display text-lg text-ink">Readiness checklist</h2>
              <ul className="mt-4 space-y-3">
                {readiness.checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-3 border-b border-line pb-3 last:border-0">
                    {c.passed ? (
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand-500" />
                    ) : (
                      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-alert" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-ink">{c.label}</p>
                      <p className="text-xs text-ink/50">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <h2 className="font-display text-lg text-ink">{taxConfig.countryName} tax configuration</h2>
            <p className="mt-1 text-xs text-ink/45">Tax rules version {taxConfig.taxRulesVersion} · Tax year 2026</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-ink/45">{taxConfig.vatLabel}</p>
                <p className="font-medium text-ink">{taxConfig.vatRate ? `${(taxConfig.vatRate * 100).toFixed(1)}%` : "Not configured"}</p>
              </div>
              <div>
                <p className="text-xs text-ink/45">{taxConfig.withholdingTaxLabel}</p>
                <p className="font-medium text-ink">Applies per transaction category</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink/45">Compliance checklist:</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {taxConfig.complianceChecklist.map((c) => (
                <li key={c} className="rounded-full bg-sand px-3 py-1 text-xs text-ink/65">
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <p className="rounded-lg border border-clay/30 bg-clay/10 p-4 text-xs leading-relaxed text-alert">
          {taxConfig.disclaimer}
        </p>
      </div>
    </>
  );
}
