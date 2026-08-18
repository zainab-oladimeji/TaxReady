import Link from "next/link";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "Product", href: "#solution" },
  { label: "How It Works", href: "#ai" },
  { label: "For SMEs", href: "#problem" },
  { label: "For Accountants", href: "#accountants" },
  { label: "AI", href: "#ai" },
  { label: "Security", href: "#security" },
  { label: "About", href: "#google" }
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-xl tracking-tight text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper text-xs font-sans font-semibold">
            T
          </span>
          TaxReady
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="focus-ring rounded text-sm text-ink/70 hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/auth/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
