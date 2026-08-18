"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTaxReadyData } from "@/components/providers/data-provider";
import { formatMoney } from "@/lib/format";
import { FileText, Download, Loader2 } from "lucide-react";
import { ReportType, PeriodSummary } from "@/types";

const REPORT_TYPES: { type: ReportType; title: string; description: string }[] = [
  { type: "transaction_report", title: "Transaction Report", description: "Every transaction in the selected period." },
  { type: "expense_report", title: "Expense Report", description: "All categorized business expenses." },
  { type: "revenue_report", title: "Revenue Report", description: "Sales and service revenue breakdown." },
  { type: "tax_period_summary", title: "Tax Period Summary", description: "AI-generated narrative summary for the period." },
  { type: "receipt_report", title: "Receipt Report", description: "Index of all receipts and what they're linked to." },
  { type: "accountant_review_pack", title: "Accountant Review Pack", description: "Full bundle: summary, flags, missing documents, AI notes." }
];

interface GeneratedReport {
  id: string;
  title: string;
  createdAt: string;
  summary: PeriodSummary;
}

export default function ReportsPage() {
  const { transactions, receipts, business } = useTaxReadyData();
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [reports, setReports] = useState<GeneratedReport[]>([]);

  async function handleGenerate(type: ReportType, title: string) {
    setGenerating(type);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodLabel: "Aug 2026", businessId: business.id, transactions, receipts })
      });
      const summary: PeriodSummary = await res.json();
      setReports((prev) => [{ id: `${type}-${Date.now()}`, title, createdAt: new Date().toISOString(), summary }, ...prev]);
    } finally {
      setGenerating(null);
    }
  }

  function downloadCsv(report: GeneratedReport) {
    const rows = [
      ["Business", business.name],
      ["Report", report.title],
      ["Period", report.summary.periodLabel],
      [],
      ["Metric", "Value"],
      ["Total revenue", String(report.summary.totalRevenue)],
      ["Total expenses", String(report.summary.totalExpenses)],
      ["Net position", String(report.summary.netPosition)],
      ["Transactions", String(report.summary.transactionCount)],
      ["Categorized", String(report.summary.categorizedCount)],
      ["Needs review", String(report.summary.needsReviewCount)],
      [],
      ["Summary"],
      [report.summary.narrative]
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Topbar title="Reports" />
      <div className="space-y-8 p-5 md:p-8">
        <div>
          <p className="mb-4 text-sm text-ink/55">Generate accountant-ready reports from your current records.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_TYPES.map((r) => (
              <Card key={r.type}>
                <CardContent>
                  <FileText size={18} className="text-brand-600" />
                  <h3 className="mt-3 font-display text-base text-ink">{r.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink/55">{r.description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => handleGenerate(r.type, r.title)}
                    disabled={generating === r.type}
                  >
                    {generating === r.type ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {reports.length > 0 && (
          <div>
            <h2 className="mb-4 font-display text-lg text-ink">Generated reports</h2>
            <div className="space-y-3">
              {reports.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-ink">{r.title}</p>
                      <p className="mt-1 max-w-xl text-sm text-ink/60">{r.summary.narrative}</p>
                      <p className="mt-2 text-xs text-ink/40">
                        {formatMoney(r.summary.totalRevenue)} revenue · {formatMoney(r.summary.totalExpenses)} expenses ·{" "}
                        {r.summary.needsReviewCount} need review
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadCsv(r)}>
                      <Download size={14} /> Download CSV
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {reports.length === 0 && (
          <p className="rounded-xl2 border border-dashed border-line bg-white py-10 text-center text-sm text-ink/45">
            Generate your first financial report after importing transactions.
          </p>
        )}
      </div>
    </>
  );
}
