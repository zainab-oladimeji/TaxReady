import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grain flex min-h-screen items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-display text-xl text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper text-xs font-sans font-semibold">
            T
          </span>
          TaxReady
        </Link>
        <Card>
          <CardContent className="p-8">
            <h1 className="font-display text-2xl text-ink">{title}</h1>
            <p className="mt-1.5 text-sm text-ink/55">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
