"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  TrendingDown,
  TrendingUp,
  Gauge,
  FileText,
  Sparkles,
  Building2,
  Users,
  Settings,
  LogOut
} from "lucide-react";
import { signOutUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/receipts", label: "Receipts", icon: Receipt },
  { href: "/dashboard/transactions?type=expense", label: "Expenses", icon: TrendingDown },
  { href: "/dashboard/transactions?type=income", label: "Sales", icon: TrendingUp },
  { href: "/dashboard/tax-readiness", label: "Tax Readiness", icon: Gauge },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/dashboard/businesses", label: "Businesses", icon: Building2 },
  { href: "/dashboard/accountant", label: "Accountant", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white md:flex">
      <Link href="/" className="flex items-center gap-2 border-b border-line px-5 py-5 font-display text-lg text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper text-[10px] font-sans font-semibold">
          T
        </span>
        TaxReady
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const basePath = item.href.split("?")[0];
          const active = item.exact ? pathname === basePath : pathname.startsWith(basePath) && basePath !== "/dashboard";
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-brand-50 font-medium text-brand-700" : "text-ink/65 hover:bg-sand"
              )}
            >
              <Icon size={16} /> {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={async () => {
          await signOutUser();
          router.push("/");
        }}
        className="focus-ring m-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink/50 hover:bg-sand"
      >
        <LogOut size={16} /> Sign out
      </button>
    </aside>
  );
}
