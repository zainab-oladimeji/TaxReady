"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Business, Receipt, Transaction } from "@/types";
import { DEMO_BUSINESS, DEMO_RECEIPTS, DEMO_TRANSACTIONS } from "@/lib/data/demo-data";
import { calculateReadiness } from "@/lib/readiness";

/**
 * Two modes, one interface:
 *  - Signed in (real Auth.js session): reads/writes go through
 *    /api/transactions, /api/receipts, /api/business — all MongoDB-backed
 *    and scoped server-side to the session's business. This is real data.
 *  - Not signed in (the /dashboard?demo=1 path from /demo): everything is
 *    in-memory, seeded from lib/data/demo-data.ts. Nothing here ever
 *    touches MongoDB — there's no session to scope it to.
 *
 * Every mutation below is a real Firestore-style write in production terms —
 * this is the module described in ARCHITECTURE.md as "the main integration
 * step," now implemented against MongoDB instead of left in-memory.
 */
interface DataContextValue {
  business: Business;
  transactions: Transaction[];
  receipts: Receipt[];
  readiness: ReturnType<typeof calculateReadiness>;
  importTransactions: (rows: { date: string; description: string; amount: number; type: "income" | "expense" }[]) => Promise<void>;
  uploadReceipt: (fileName: string, mimeType: string, base64: string) => Promise<Receipt>;
  addManualReceipt: (fields: {
    merchant?: string;
    date?: string;
    amount?: number;
    vatAmount?: number;
    currency?: string;
    category?: string;
    paymentMethod?: string;
  }) => Promise<Receipt>;
  updateTransactionCategory: (id: string, category: string, status: Transaction["status"]) => void;
  isProcessing: boolean;
  isLive: boolean;
  isLoading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const isLive = status === "authenticated";

  const [business, setBusiness] = useState<Business>(DEMO_BUSINESS);
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);
  const [receipts, setReceipts] = useState<Receipt[]>(DEMO_RECEIPTS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLive) {
      // Demo mode: always the same fictional dataset, no network calls.
      setBusiness(DEMO_BUSINESS);
      setTransactions(DEMO_TRANSACTIONS);
      setReceipts(DEMO_RECEIPTS);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const [txRes, rcRes] = await Promise.all([fetch("/api/transactions"), fetch("/api/receipts")]);
        const txData = await txRes.json();
        const rcData = await rcRes.json();
        if (cancelled) return;
        setBusiness(txData.business ?? DEMO_BUSINESS);
        setTransactions(txData.transactions ?? []);
        setReceipts(rcData.receipts ?? []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLive, session?.user]);

  const importTransactions = useCallback(
    async (rows: { date: string; description: string; amount: number; type: "income" | "expense" }[]) => {
      setIsProcessing(true);
      try {
        if (isLive) {
          const res = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows })
          });
          const data = await res.json();
          setTransactions((prev) => [...(data.transactions ?? []), ...prev]);
          return;
        }

        // Demo mode: classify the whole import in one batched AI call
        // instead of one call per row, keep everything in memory —
        // nothing is persisted anywhere.
        const res = await fetch("/api/ai/classify-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactions: rows.map((row) => ({
              description: row.description,
              amount: row.amount,
              type: row.type,
              currency: "NGN"
            }))
          })
        });
        const { results } = await res.json();
        const now = new Date().toISOString();
        const classified: Transaction[] = rows.map((row, i) => {
          const classification = results[i];
          return {
            id: `import-${Date.now()}-${i}`,
            businessId: DEMO_BUSINESS.id,
            date: row.date,
            description: row.description,
            amount: row.amount,
            currency: "NGN",
            type: row.type,
            category: classification.category,
            subcategory: classification.subcategory,
            taxRelevance: classification.taxRelevance,
            aiConfidence: classification.confidence,
            aiReason: classification.reason,
            status: classification.requiresReview ? "flagged" : "pending",
            createdAt: now,
            updatedAt: now
          };
        });
        setTransactions((prev) => [...classified, ...prev]);
      } finally {
        setIsProcessing(false);
      }
    },
    [isLive]
  );

  const uploadReceipt = useCallback(
    async (fileName: string, mimeType: string, base64: string): Promise<Receipt> => {
      setIsProcessing(true);
      try {
        const endpoint = isLive ? "/api/receipts" : "/api/receipts/process";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName, mimeType, base64 })
        });
        const data = await res.json();

        if (!res.ok) {
          // Previously this branch didn't exist — a failed request's
          // {error: "..."} body was treated as if it were a successful
          // extraction, silently rendering a receipt with every field
          // blank instead of surfacing what actually went wrong.
          throw new Error(data.error ?? "We couldn't process this receipt.");
        }

        if (isLive) {
          // /api/receipts returns an already-persisted Receipt document.
          setReceipts((prev) => [data, ...prev]);
          return data as Receipt;
        }

        // /api/receipts/process returns a raw extraction — assemble a
        // client-only Receipt, kept in memory only.
        const receipt: Receipt = {
          id: `rcpt-${Date.now()}`,
          businessId: DEMO_BUSINESS.id,
          fileName,
          merchant: data.merchant,
          date: data.date,
          amount: data.amount,
          vatAmount: data.vatAmount,
          currency: data.currency,
          category: data.category,
          paymentMethod: data.paymentMethod,
          aiConfidence: data.confidence,
          status: "extracted",
          createdAt: new Date().toISOString()
        };
        setReceipts((prev) => [receipt, ...prev]);
        return receipt;
      } finally {
        setIsProcessing(false);
      }
    },
    [isLive]
  );

  const addManualReceipt = useCallback(
    async (fields: {
      merchant?: string;
      date?: string;
      amount?: number;
      vatAmount?: number;
      currency?: string;
      category?: string;
      paymentMethod?: string;
    }): Promise<Receipt> => {
      // The manual-entry fallback (see UploadReceiptModal) when AI
      // extraction fails or the person just wants to type it themselves.
      if (isLive) {
        const res = await fetch("/api/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: "Manual entry", manual: true, manualFields: fields })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "We couldn't save this receipt.");
        setReceipts((prev) => [data, ...prev]);
        return data as Receipt;
      }

      // Demo mode: no server round-trip needed, this is in-memory only.
      const receipt: Receipt = {
        id: `rcpt-${Date.now()}`,
        businessId: DEMO_BUSINESS.id,
        fileName: "Manual entry",
        ...fields,
        status: "needs_review",
        createdAt: new Date().toISOString()
      };
      setReceipts((prev) => [receipt, ...prev]);
      return receipt;
    },
    [isLive]
  );

  const updateTransactionCategory = useCallback(
    (id: string, category: string, status: Transaction["status"]) => {
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category, status, updatedAt: new Date().toISOString() } : t)));
      if (isLive) {
        fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, status })
        }).catch(() => {
          // Best-effort — the optimistic local update already happened;
          // a failed PATCH here just means the next full reload will
          // re-sync from MongoDB.
        });
      }
    },
    [isLive]
  );

  const readiness = useMemo(() => calculateReadiness(transactions, receipts), [transactions, receipts]);

  const value: DataContextValue = {
    business,
    transactions,
    receipts,
    readiness,
    importTransactions,
    uploadReceipt,
    addManualReceipt,
    updateTransactionCategory,
    isProcessing,
    isLive,
    isLoading
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useTaxReadyData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useTaxReadyData must be used within DataProvider");
  return ctx;
}
