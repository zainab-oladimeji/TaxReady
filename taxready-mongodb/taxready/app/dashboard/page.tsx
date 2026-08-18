"use client";

import { useMemo } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ReadinessRing } from "@/components/ui/readiness-ring";
import { useTaxReadyData } from "@/components/providers/data-provider";
import { formatMoney } from "@/lib/format";
import { Wallet, TrendingDown, ArrowLeftRight, ScanLine, Receipt as ReceiptIcon, Gauge, Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import Link from "next/link";

const CATEGORY_COLORS = ["#1F8F5F", "#4CAE7F", "#7FC6A0", "#AEDCC1", "#C77B4A", "#166B47", "#0F4F35"];

export default function OverviewPage() {
  const { transactions, receipts, readiness } = useTaxReadyData();

  const totals = useMemo(() => {
    const revenue = transactions.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const expenses = transactions.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const uncategorized = transactions.filter((t) => t.status === "pending").length;
    return { revenue, expenses, uncategorized };
  }, [transactions]);

  const monthly = useMemo(() => {
    const buckets = new Map<string, { month: string; revenue: number; expenses: number }>();
    for (const t of transactions) {
      const month = t.date.slice(0, 7);
      const entry = buckets.get(month) ?? { month, revenue: 0, expenses: 0 };
      if (t.type === "income") entry.revenue += t.amount;
      else entry.expenses += t.amount;
      buckets.set(month, entry);
    }
    return [...buckets.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const totalsByCategory = new Map<string, number>();
    for (const t of transactions.filter((t) => t.type === "expense")) {
      totalsByCategory.set(t.category, (totalsByCategory.get(t.category) ?? 0) + t.amount);
    }
    return [...totalsByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const taxRelevance = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      const label = (t.taxRelevance ?? "not_tax_relevant").replace(/_/g, " ");
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <>
      <Topbar title="Overview" />
      <div className="space-y-6 p-5 md:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total Revenue" value={formatMoney(totals.revenue)} icon={Wallet} tone="success" />
          <StatCard label="Total Expenses" value={formatMoney(totals.expenses)} icon={TrendingDown} />
          <StatCard label="Transactions" value={transactions.length.toLocaleString()} icon={ArrowLeftRight} />
          <StatCard label="Uncategorized" value={totals.uncategorized.toLocaleString()} icon={ScanLine} tone="warning" />
          <StatCard label="Receipts" value={receipts.length.toLocaleString()} icon={ReceiptIcon} />
          <StatCard label="Readiness" value={`${readiness.score}%`} icon={Gauge} tone="success" />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Revenue vs Expenses" subtitle="Over the last several months">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F8F5F" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#1F8F5F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C77B4A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C77B4A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4DE" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#0F1B1699" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#0F1B1699" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E4E4DE" }} />
                  <Area type="monotone" dataKey="revenue" stroke="#1F8F5F" fill="url(#rev)" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#C77B4A" fill="url(#exp)" strokeWidth={2} name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Record readiness" subtitle={readiness.label}>
            <div className="flex flex-col items-center gap-4 py-2">
              <ReadinessRing
                score={readiness.score}
                size={150}
                segments={[
                  { label: "Categorized", value: 0.4, color: "#1F8F5F" },
                  { label: "Receipts", value: 0.25, color: "#4CAE7F" },
                  { label: "Reviewed", value: 0.17, color: "#AEDCC1" }
                ]}
              />
              <Link href="/dashboard/tax-readiness" className="text-xs font-medium text-brand-600 hover:underline">
                View full breakdown →
              </Link>
            </div>
          </ChartCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Top expense categories">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E4E4DE" }} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink/60">
              {categoryBreakdown.map((c, i) => (
                <li key={c.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  {c.name}
                </li>
              ))}
            </ul>
          </ChartCard>

          <ChartCard title="Tax-relevant transactions" subtitle="By classification">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={taxRelevance} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4DE" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#0F1B1699" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: "#0F1B1699" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4E4DE" }} />
                <Bar dataKey="value" fill="#1F8F5F" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="flex items-start gap-3 rounded-xl2 border border-brand-100 bg-brand-50 p-5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
            <Sparkles size={15} />
          </span>
          <div>
            <p className="text-sm font-medium text-brand-800">Ask TaxReady</p>
            <p className="mt-1 text-sm leading-relaxed text-brand-800/80">
              I found {totals.uncategorized} uncategorized transactions and a few large expenses without a
              receipt attached. Head to the AI Assistant to ask what needs attention before your next tax
              period review.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
