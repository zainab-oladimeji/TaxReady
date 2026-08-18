"use client";

import { useState } from "react";
import Papa from "papaparse";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { useTaxReadyData } from "@/components/providers/data-provider";

interface CsvRow {
  date: string;
  description: string;
  amount: string;
  type: string;
}

export function ImportCsvModal({ onClose }: { onClose: () => void }) {
  const { importTransactions, isProcessing } = useTaxReadyData();
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleFile(file: File) {
    setFileName(file.name);
    setError(null);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const valid = results.data.filter((r) => r.date && r.description && r.amount);
        if (valid.length === 0) {
          setError("We couldn't find valid rows. Expect columns: date, description, amount, type.");
          return;
        }
        setRows(valid.slice(0, 50)); // cap for the demo so classification stays snappy
      }
    });
  }

  async function handleImport() {
    if (!rows) return;
    await importTransactions(
      rows.map((r) => ({
        date: r.date,
        description: r.description,
        amount: Math.abs(Number(r.amount)) || 0,
        type: (r.type?.toUpperCase() === "CREDIT" || r.type?.toLowerCase() === "income" ? "income" : "expense") as
          | "income"
          | "expense"
      }))
    );
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-lg rounded-xl2 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Import transactions</h2>
          <button onClick={onClose} className="focus-ring rounded-full p-1 text-ink/50 hover:bg-sand" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="py-6 text-center">
            <p className="font-medium text-ink">Processing complete.</p>
            <p className="mt-1 text-sm text-ink/55">{rows?.length} transactions were categorized with AI and added to your records.</p>
            <Button className="mt-5" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : rows ? (
          <div>
            <p className="text-sm text-ink/65">
              {fileName} — {rows.length} rows ready to import.
            </p>
            <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-xs">
                <thead className="bg-sand text-left text-ink/50">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="p-2">{r.date}</td>
                      <td className="max-w-[180px] truncate p-2">{r.description}</td>
                      <td className="p-2 text-right numeral">{r.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="mt-4 w-full" onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? `Processing ${rows.length} transactions with AI...` : `Classify & import ${rows.length} transactions`}
            </Button>
          </div>
        ) : (
          <>
            <FileUploader
              accept=".csv"
              label="Drop your CSV file here, or click to browse"
              hint="date, description, amount, type — e.g. 2026-08-01,Shoprite,45500,DEBIT"
              onFile={handleFile}
            />
            {error && <p className="mt-3 text-xs text-alert">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
