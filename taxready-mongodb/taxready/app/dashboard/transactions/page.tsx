"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { TransactionTable } from "@/components/dashboard/transaction-table";
import { ImportCsvModal } from "@/components/dashboard/import-csv-modal";
import { UploadCloud } from "lucide-react";

function TransactionsInner() {
  const params = useSearchParams();
  const typeParam = params.get("type");
  const initialTypeFilter = typeParam === "income" || typeParam === "expense" ? typeParam : undefined;
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <Topbar title="Transactions" />
      <div className="p-5 md:p-8">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-ink/55">Search, filter and review every transaction across your business.</p>
          <Button onClick={() => setShowImport(true)}>
            <UploadCloud size={16} /> Import CSV
          </Button>
        </div>
        <TransactionTable initialTypeFilter={initialTypeFilter} />
      </div>
      {showImport && <ImportCsvModal onClose={() => setShowImport(false)} />}
    </>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsInner />
    </Suspense>
  );
}
