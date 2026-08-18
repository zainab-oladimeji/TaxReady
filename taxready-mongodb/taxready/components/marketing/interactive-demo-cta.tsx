import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UploadCloud, Sparkles, Receipt, FileCheck2, ArrowRight } from "lucide-react";

const STEPS = [
  { icon: UploadCloud, label: "Upload transaction file" },
  { icon: Sparkles, label: "AI categorization" },
  { icon: Receipt, label: "Receipt extraction" },
  { icon: FileCheck2, label: "Report generation" }
];

export function InteractiveDemoCTA() {
  return (
    <section className="border-b border-line/70">
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Live walkthrough</p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">See TaxReady in action</h2>
        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3">
          {STEPS.map(({ icon: Icon, label }, i) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink/70">
                <Icon size={14} className="text-brand-500" /> {label}
              </span>
              {i < STEPS.length - 1 && <ArrowRight size={14} className="text-ink/25" />}
            </div>
          ))}
        </div>
        <Link href="/demo" className="mt-10 inline-block">
          <Button size="lg">
            Launch Interactive Demo <ArrowRight size={16} />
          </Button>
        </Link>
      </div>
    </section>
  );
}
