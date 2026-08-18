"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";
import { useTaxReadyData } from "@/components/providers/data-provider";

const MOBILE_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/receipts", label: "Receipts" },
  { href: "/dashboard/tax-readiness", label: "Tax Readiness" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/ai-assistant", label: "AI Assistant" },
  { href: "/dashboard/accountant", label: "Accountant" },
  { href: "/dashboard/settings", label: "Settings" }
];

export function Topbar({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const { business } = useTaxReadyData();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-5 py-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <button
          className="focus-ring rounded-lg p-1.5 text-ink md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <p className="text-xs text-ink/45">{business.name}</p>
          <h1 className="font-display text-xl text-ink">{title}</h1>
        </div>
      </div>
      <div className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink/40 sm:flex">
        <Search size={14} /> Search transactions, receipts, reports…
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-72 bg-white p-5">
            <button className="focus-ring mb-6 rounded-lg p-1.5" onClick={() => setOpen(false)} aria-label="Close navigation menu">
              <X size={20} />
            </button>
            <nav className="space-y-1">
              {MOBILE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="focus-ring block rounded-lg px-3 py-2.5 text-sm text-ink/75 hover:bg-sand"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-1 bg-ink/40" onClick={() => setOpen(false)} />
        </div>
      )}
    </header>
  );
}
