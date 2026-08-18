import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldCheck, Lock, KeyRound, FileClock, Trash2, Eye } from "lucide-react";

export function AfricanMarketSection() {
  const CHANNELS = ["Bank transfers", "POS", "Cash", "Mobile payments", "Spreadsheets", "Paper receipts", "Informal record keeping"];
  return (
    <section className="border-b border-line/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Built for Africa first</p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">
              Built for how African businesses actually operate.
            </h2>
            <p className="mt-5 leading-relaxed text-ink/65">
              Many SMEs run their finances across several channels at once — not because of poor practice,
              but because that&rsquo;s how commerce actually flows day to day. TaxReady bridges those
              fragmented records into one structured picture, starting in Nigeria and expanding across the
              continent.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {CHANNELS.map((c) => (
              <span key={c} className="rounded-full bg-sand px-4 py-2 text-sm text-ink/70">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Free",
    price: "₦0",
    features: ["1 business", "Transaction imports", "Basic categorization", "Limited AI processing"]
  },
  {
    name: "Business",
    price: "Coming Soon",
    features: ["Multiple imports", "Receipt intelligence", "Advanced AI", "Reports", "Compliance readiness"],
    featured: true
  },
  {
    name: "Accountant",
    price: "Coming Soon",
    features: ["Multiple clients", "Client dashboard", "Review workflows", "Accountant reports"]
  }
];

export function PricingSection() {
  return (
    <section id="pricing" className="border-b border-line/70 bg-sand/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Pricing</p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">Start free. Grow into it.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <Card key={p.name} className={p.featured ? "border-ink ring-1 ring-ink" : undefined}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl text-ink">{p.name}</h3>
                  {p.featured && <Badge tone="success">Popular</Badge>}
                </div>
                <p className="mt-2 font-display text-2xl text-ink">{p.price}</p>
                <ul className="mt-5 space-y-2 text-sm text-ink/65">
                  {p.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Button variant={p.featured ? "primary" : "outline"} className="mt-6 w-full" disabled={p.price === "Coming Soon"}>
                  {p.price === "Coming Soon" ? "Coming Soon" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const SECURITY_ITEMS = [
  { icon: Lock, title: "Encrypted communication", body: "All data in transit is protected with TLS." },
  { icon: KeyRound, title: "Authentication", body: "Auth.js with Google Sign-In and email/password, hashed and stored securely." },
  { icon: ShieldCheck, title: "Role-based access", body: "Business membership and role checks enforced server-side." },
  { icon: Eye, title: "Controlled AI processing", body: "AI only ever sees the authenticated business's own data." },
  { icon: FileClock, title: "Auditability", body: "Key actions are logged for later review." },
  { icon: Trash2, title: "Data deletion", body: "Delete an account, business, or document whenever you choose." }
];

export function SecuritySection() {
  return (
    <section id="security" className="border-b border-line/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Security</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight text-ink sm:text-4xl">
          Your financial records deserve serious protection.
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_ITEMS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon size={16} />
              </span>
              <div>
                <h3 className="text-sm font-medium text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/60">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FOOTER_COLUMNS = [
  { title: "Product", links: ["Product", "How It Works", "AI", "Pricing"] },
  { title: "Audience", links: ["For SMEs", "For Accountants"] },
  { title: "Company", links: ["Security", "About"] }
];

export function Footer() {
  return (
    <footer className="bg-ink text-paper/70">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg text-paper">TaxReady</p>
            <p className="mt-2 max-w-[220px] text-sm">Turn business transactions into tax-ready records.</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-medium uppercase tracking-wide text-paper/45">{col.title}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="hover:text-paper">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-paper/10 pt-6 text-xs text-paper/40">
          TaxReady prepares and organizes business records. It does not provide legal or tax advice and does
          not replace a qualified tax professional. © 2026 TaxReady.
        </div>
      </div>
    </footer>
  );
}
