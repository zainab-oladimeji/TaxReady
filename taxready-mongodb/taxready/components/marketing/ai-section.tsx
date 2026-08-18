"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Receipt, Sparkles, UploadCloud } from "lucide-react";

export function AISection() {
  return (
    <section id="ai" className="border-b border-line/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">AI</p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">
              Your financial records, understood by AI.
            </h2>
            <p className="mt-5 leading-relaxed text-ink/65">
              TaxReady uses Google&rsquo;s Gemini models — via Vertex AI — to read messy transaction
              descriptions and financial documents the way a bookkeeper would, then explain what it found.
            </p>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs text-ink/45">
                <span>Input</span>
                <Badge tone="neutral">POS transaction</Badge>
              </div>
              <div className="rounded-lg bg-sand/70 p-4 font-mono text-sm text-ink/80">
                POS PAYMENT
                <br />
                SHOPRITE
                <br />
                ₦45,500
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-brand-600">
                <Sparkles size={13} /> Gemini output
              </div>
              <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line p-4 text-sm">
                <Row label="Category" value="Business Expense" />
                <Row label="Subcategory" value="Inventory / Supplies" />
                <Row label="Confidence" value="96%" />
                <Row label="Tax relevance" value="Potentially deductible" />
              </dl>
              <p className="flex items-center gap-1.5 text-xs text-ink/50">
                <CheckCircle2 size={13} className="text-brand-500" /> Review recommended before this period closes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

const STAGES = ["Analyzing document...", "Extracting financial information...", "Checking transaction match...", "Ready"];

export function ReceiptIntelligence() {
  const [stage, setStage] = useState(-1);
  const running = stage >= 0 && stage < STAGES.length - 1;
  const done = stage === STAGES.length - 1;

  function runDemo() {
    setStage(0);
    STAGES.forEach((_, i) => {
      setTimeout(() => setStage(i), i * 550);
    });
  }

  return (
    <section className="border-b border-line/70 bg-sand/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Receipt Intelligence</p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">
              Drop a receipt. Gemini does the reading.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-ink/65">
              Upload a photo of any receipt or invoice. Vertex AI Gemini extracts the merchant, date, amount,
              VAT, and category — you just confirm it.
            </p>
            <Button className="mt-6" onClick={runDemo} disabled={running}>
              <UploadCloud size={16} /> {done ? "Run again" : running ? "Processing..." : "Try receipt.jpg"}
            </Button>
          </div>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3 border-b border-line pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Receipt size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">receipt.jpg</p>
                  <p className="text-xs text-ink/45">82 KB · uploaded just now</p>
                </div>
              </div>

              {stage === -1 && <p className="py-8 text-center text-sm text-ink/45">Waiting for upload…</p>}

              {stage >= 0 && !done && (
                <ul className="space-y-2 py-5 text-sm text-ink/70">
                  {STAGES.slice(0, -1).map((s, i) => (
                    <li key={s} className={`flex items-center gap-2 ${i <= stage ? "opacity-100" : "opacity-30"}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {s}
                    </li>
                  ))}
                </ul>
              )}

              {done && (
                <div className="space-y-3 py-4">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <Row label="Merchant" value="ABC Office Supplies" />
                    <Row label="Date" value="18 Aug 2026" />
                    <Row label="Amount" value="₦82,500" />
                    <Row label="VAT" value="₦6,187.50" />
                    <Row label="Category" value="Office Supplies" />
                    <Row label="Payment method" value="Card" />
                  </dl>
                  <p className="flex items-center gap-1.5 pt-2 text-sm font-medium text-brand-600">
                    <CheckCircle2 size={15} /> Added to your records.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink/45">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
