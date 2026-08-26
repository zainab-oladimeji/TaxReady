import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/misc-sections";

export function LegalLayout({
  title,
  lastUpdated,
  children
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm">
          <Link href="/" className="text-ink/45 hover:text-ink">
            ← Back to TaxReady
          </Link>
        </p>
        <h1 className="mt-4 font-display text-3xl text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink/45">Last updated: {lastUpdated}</p>
        <div className="prose-legal mt-10 space-y-6 text-sm leading-relaxed text-ink/75">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
