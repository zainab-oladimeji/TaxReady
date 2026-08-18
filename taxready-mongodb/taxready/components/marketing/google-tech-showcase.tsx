import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Database, HardDrive, LineChart, ServerCog, Sparkles, ShieldCheck, FolderOpen, Sheet } from "lucide-react";

const STACK = [
  { icon: ServerCog, name: "Cloud Run", role: "Runs the TaxReady Next.js app and API routes." },
  { icon: Sparkles, name: "Vertex AI · Gemini", role: "Transaction classification, receipt understanding, AI assistant." },
  { icon: Database, name: "MongoDB", role: "Stores accounts, businesses, transactions, receipts and reports." },
  { icon: ShieldCheck, name: "Auth.js", role: "Google Sign-In and email/password authentication." },
  { icon: HardDrive, name: "Cloud Storage", role: "Holds uploaded receipt and invoice files." },
  { icon: LineChart, name: "Cloud Monitoring & Logging", role: "Reliability, observability and AI processing logs." }
];

const FUTURE = [
  { icon: FolderOpen, name: "Google Drive", role: "Future: ingest documents straight from a client's Drive folder." },
  { icon: Sheet, name: "Google Sheets", role: "Future: sync records to and from Sheets for accountants." }
];

export function GoogleTechShowcase() {
  return (
    <section id="google" className="border-b border-line/70 bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-brand-300">
          <Cloud size={14} /> Google Cloud AI, on a flexible backend
        </div>
        <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight sm:text-4xl">
          Vertex AI Gemini at the core, MongoDB and Auth.js underneath.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/60">
          The AI is Google&rsquo;s — Vertex AI Gemini does the classification, extraction, and summarization
          work. The data layer is MongoDB, chosen for flexible schemas as transaction and receipt shapes
          evolve, with Auth.js handling sign-in against the same database.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-paper/60">
          {["Cloud Run", "Auth.js", "MongoDB", "Vertex AI / Gemini", "Cloud Storage", "Cloud Monitoring"].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-paper/20 px-3 py-1">{step}</span>
              {i < arr.length - 1 && <span className="text-paper/25">→</span>}
            </span>
          ))}
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map(({ icon: Icon, name, role }) => (
            <Card key={name} className="border-paper/10 bg-white/[0.04] shadow-none backdrop-blur-0">
              <CardContent>
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                  <Icon size={17} />
                </span>
                <h3 className="text-sm font-medium text-paper">{name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-paper/55">{role}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 border-t border-paper/10 pt-8 text-xs text-paper/50">
          <span className="uppercase tracking-wide text-paper/40">Roadmap</span>
          {FUTURE.map(({ icon: Icon, name, role }) => (
            <span key={name} className="flex items-center gap-1.5">
              <Icon size={13} /> {name} — {role}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
