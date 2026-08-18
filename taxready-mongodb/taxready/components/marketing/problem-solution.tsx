import { Card, CardContent } from "@/components/ui/card";
import { Inbox, ScanEye, FolderCheck, FileOutput } from "lucide-react";

const CHANNELS = ["Bank statements", "POS records", "WhatsApp", "Excel", "Receipts", "Invoices", "Notebooks", "Accounting software"];

const SOLUTION_CARDS = [
  { icon: Inbox, title: "Capture", body: "Import transactions, receipts and invoices from wherever they already live." },
  { icon: ScanEye, title: "Understand", body: "AI identifies what each transaction represents — before a human ever opens it." },
  { icon: FolderCheck, title: "Organize", body: "Automatically categorize income, expenses, purchases and tax-relevant records." },
  { icon: FileOutput, title: "Prepare", body: "Generate period summaries and accountant-ready reports in a click." }
];

export function ProblemSection() {
  return (
    <section id="problem" className="border-b border-line/70 bg-sand/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">For SMEs</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">
            Small businesses don&rsquo;t have a transaction problem.
            <br />
            They have a record-keeping problem.
          </h2>
          <p className="mt-5 leading-relaxed text-ink/65">
            Financial activity for a typical African SME is scattered across every channel it happens to arrive
            in — which makes it nearly impossible to see the whole picture when tax season comes around.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-2.5">
          {CHANNELS.map((c) => (
            <span key={c} className="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink/70">
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SolutionSection() {
  return (
    <section id="solution" className="border-b border-line/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Product</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">
            One place to turn financial activity into structured records.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SOLUTION_CARDS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="transition-transform hover:-translate-y-0.5">
              <CardContent>
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon size={18} />
                </span>
                <h3 className="font-display text-lg text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
