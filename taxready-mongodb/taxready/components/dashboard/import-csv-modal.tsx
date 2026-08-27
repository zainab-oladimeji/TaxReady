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

// Classification is now chunked + retried server-side (see
// lib/ai/robust-batch.ts), and a signed-in import runs as a background
// job (see app/api/transactions/import) rather than one long request, so
// this is no longer capped at a tiny "demo" size. It still needs a
// ceiling for sanity/UX reasons — this matches the backend's own cap.
const IMPORT_ROW_CAP = 5000;

export function ImportCsvModal({ onClose }: { onClose: () => void }) {
  const { importTransactions, isProcessing, importProgress } = useTaxReadyData();
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
        if (valid.length > IMPORT_ROW_CAP) {
          setError(
            `This file has ${valid.length} rows — imports are currently limited to ${IMPORT_ROW_CAP} at a time. ` +
              `We're importing the first ${IMPORT_ROW_CAP}; split the rest into a separate file and import it next.`
          );
        }
        setRows(valid.slice(0, IMPORT_ROW_CAP));
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
      })),
      fileName
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
            {error && <p className="mt-2 text-xs text-alert">{error}</p>}
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
              {isProcessing
                ? importProgress
                  ? `Classifying ${importProgress.processed} of ${importProgress.total}...`
                  : "Starting import..."
                : `Classify & import ${rows.length} transactions`}
            </Button>
            {isProcessing && importProgress && importProgress.total > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (importProgress.processed / importProgress.total) * 100)}%` }}
                />
              </div>
            )}
            {isProcessing && (
              <p className="mt-2 text-center text-xs text-ink/45">
                You can close this and keep using TaxReady — the import finishes in the background.
              </p>
            )}
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
