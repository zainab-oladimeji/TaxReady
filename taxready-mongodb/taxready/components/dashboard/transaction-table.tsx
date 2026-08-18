"use client";

import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, FileCheck2, Flag, Paperclip } from "lucide-react";
import { Transaction } from "@/types";
import { formatMoney, formatDate } from "@/lib/format";
import { StatusBadge, TaxRelevanceBadge } from "@/components/dashboard/badges";
import { useTaxReadyData } from "@/components/providers/data-provider";

const PAGE_SIZE = 12;

export function TransactionTable({ initialTypeFilter }: { initialTypeFilter?: "income" | "expense" }) {
  const { transactions, updateTransactionCategory } = useTaxReadyData();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(initialTypeFilter ?? "all");
  const [statusFilter, setStatusFilter] = useState<"all" | Transaction["status"]>("all");
  const [taxFilter, setTaxFilter] = useState<"all" | "relevant">("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = transactions;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (taxFilter === "relevant") list = list.filter((t) => t.taxRelevance && t.taxRelevance !== "not_tax_relevant");
    list = [...list].sort((a, b) => (sortDesc ? (a.date < b.date ? 1 : -1) : a.date < b.date ? -1 : 1));
    return list;
  }, [transactions, query, typeFilter, statusFilter, taxFilter, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleAll() {
    if (selected.size === pageItems.length) setSelected(new Set());
    else setSelected(new Set(pageItems.map((t) => t.id)));
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function bulkMarkReviewed() {
    selected.forEach((id) => {
      const t = transactions.find((t) => t.id === id);
      if (t) updateTransactionCategory(id, t.category, "reviewed");
    });
    setSelected(new Set());
  }

  function bulkFlag() {
    selected.forEach((id) => {
      const t = transactions.find((t) => t.id === id);
      if (t) updateTransactionCategory(id, t.category, "flagged");
    });
    setSelected(new Set());
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
          <Search size={15} className="text-ink/35" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search description or category…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <Select value={typeFilter} onChange={(v) => { setTypeFilter(v as any); setPage(1); }} options={[["all", "All types"], ["income", "Income"], ["expense", "Expense"]]} />
        <Select value={statusFilter} onChange={(v) => { setStatusFilter(v as any); setPage(1); }} options={[["all", "All statuses"], ["pending", "Pending"], ["reviewed", "Reviewed"], ["flagged", "Flagged"]]} />
        <Select value={taxFilter} onChange={(v) => { setTaxFilter(v as any); setPage(1); }} options={[["all", "All tax relevance"], ["relevant", "Tax-relevant only"]]} />
        <button
          onClick={() => setSortDesc((s) => !s)}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink/65 hover:border-ink/30"
        >
          <ArrowUpDown size={14} /> {sortDesc ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-sm text-paper">
          <span>{selected.size} selected</span>
          <button onClick={bulkMarkReviewed} className="focus-ring flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
            <FileCheck2 size={13} /> Mark reviewed
          </button>
          <button onClick={bulkFlag} className="focus-ring flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">
            <Flag size={13} /> Flag
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl2 border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-sand/50 text-left text-xs text-ink/45">
              <th className="w-9 p-3">
                <input type="checkbox" checked={selected.size === pageItems.length && pageItems.length > 0} onChange={toggleAll} />
              </th>
              <th className="p-3">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Type</th>
              <th className="p-3">Category</th>
              <th className="p-3">Tax relevance</th>
              <th className="p-3">Receipt</th>
              <th className="p-3">AI confidence</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-sand/30">
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                </td>
                <td className="whitespace-nowrap p-3 text-ink/60">{formatDate(t.date)}</td>
                <td className="max-w-[220px] truncate p-3 font-medium text-ink">{t.description}</td>
                <td className={`whitespace-nowrap p-3 text-right numeral ${t.type === "income" ? "text-brand-600" : "text-ink"}`}>
                  {t.type === "income" ? "+" : "−"}
                  {formatMoney(t.amount, t.currency)}
                </td>
                <td className="p-3 capitalize text-ink/60">{t.type}</td>
                <td className="p-3 text-ink/70">{t.category}</td>
                <td className="p-3">
                  <TaxRelevanceBadge relevance={t.taxRelevance} />
                </td>
                <td className="p-3">
                  {t.receiptId ? <Paperclip size={14} className="text-brand-500" /> : <span className="text-ink/25">—</span>}
                </td>
                <td className="p-3 numeral text-ink/60">{t.aiConfidence ? `${Math.round(t.aiConfidence * 100)}%` : "—"}</td>
                <td className="p-3">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={10} className="p-10 text-center text-sm text-ink/45">
                  No transactions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-ink/55">
        <span>
          {filtered.length.toLocaleString()} transaction{filtered.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="focus-ring rounded-lg border border-line bg-white p-1.5 disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="focus-ring rounded-lg border border-line bg-white p-1.5 disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="focus-ring rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink/70"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
