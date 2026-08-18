import { Button } from "@/components/ui/button";
import { ReadinessRing } from "@/components/ui/readiness-ring";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, PlayCircle } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line/70">
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.35]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <Badge tone="info" className="mb-6">
            <Sparkles size={12} /> Built with Gemini &amp; Google Cloud
          </Badge>
          <h1 className="font-display text-[2.75rem] leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Your business records.
            <br />
            <em className="not-italic text-brand-600">Tax-ready</em>, without the chaos.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/65">
            TaxReady uses AI to transform transactions, receipts, and financial records into organized,
            compliance-ready information for African businesses.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg">
              Start Organizing Your Records <ArrowRight size={16} />
            </Button>
            <Button size="lg" variant="outline">
              <PlayCircle size={16} /> Watch Product Demo
            </Button>
          </div>
          <p className="mt-4 text-xs text-ink/45">No card required. Explore with realistic demo data in seconds.</p>
        </div>

        <div className="relative">
          <div className="rounded-xl2 border border-line bg-white p-5 shadow-card sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink/45">Lagos Retail Co.</p>
                <p className="font-display text-lg text-ink">Overview</p>
              </div>
              <Badge tone="success">Strong progress</Badge>
            </div>

            <div className="flex items-center gap-6">
              <ReadinessRing
                score={82}
                size={148}
                segments={[
                  { label: "Categorized", value: 0.4, color: "#1F8F5F" },
                  { label: "Receipts", value: 0.25, color: "#4CAE7F" },
                  { label: "Reviewed", value: 0.17, color: "#AEDCC1" }
                ]}
              />
              <dl className="grid flex-1 grid-cols-2 gap-4 text-sm">
                <Metric label="Transactions" value="1,248" />
                <Metric label="Categorized" value="1,182" />
                <Metric label="Needs Review" value="66" tone="warning" />
                <Metric label="Receipts" value="438" />
              </dl>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                <Sparkles size={13} />
              </span>
              <p className="text-sm leading-snug text-brand-800">
                <span className="font-medium">Ask TaxReady:</span> I found 12 transactions that may require
                additional documentation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div>
      <dt className="text-xs text-ink/45">{label}</dt>
      <dd className={`numeral font-display text-xl ${tone === "warning" ? "text-alert" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
