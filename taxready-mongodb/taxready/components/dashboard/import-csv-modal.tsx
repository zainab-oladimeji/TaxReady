"use client";

import { useState } from "react";
import Papa from "papaparse";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { useTaxReadyData } from "@/components/providers/data-provider";

interface NormalizedRow {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
}

interface RawCsvRow {
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

// .xlsx/.xls/.pdf all need a server round trip (see
// app/api/transactions/parse-statement) to have their layout figured out
// — .csv stays fully client-side via Papa Parse below, since its fixed
// four-column shape is simple enough not to need that.
const STATEMENT_MIME_TYPES: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pdf: "application/pdf"
};

function normalizeType(raw: string): "income" | "expense" {
  return raw?.toUpperCase() === "CREDIT" || raw?.toLowerCase() === "income" ? "income" : "expense";
}

export function ImportCsvModal({ onClose }: { onClose: () => void }) {
  const { importTransactions, isProcessing, importProgress } = useTaxReadyData();
  const [rows, setRows] = useState<NormalizedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [done, setDone] = useState(false);

  function handleCsvFile(file: File) {
    Papa.parse<RawCsvRow>(file, {
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
        setRows(
          valid.slice(0, IMPORT_ROW_CAP).map((r) => ({
            date: r.date,
            description: r.description,
            amount: Math.abs(Number(r.amount)) || 0,
            type: normalizeType(r.type)
          }))
        );
      }
    });
  }

  async function handleStatementFile(file: File, mimeType: string) {
    setIsParsing(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/transactions/parse-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType, base64 })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "We couldn't read this statement.");
        return;
      }

      const parsedRows: NormalizedRow[] = data.rows ?? [];
      if (parsedRows.length > IMPORT_ROW_CAP) {
        setWarnings([
          ...(data.warnings ?? []),
          `This statement has ${parsedRows.length} transactions — imports are currently limited to ${IMPORT_ROW_CAP} at a time. ` +
            `We're importing the first ${IMPORT_ROW_CAP}.`
        ]);
      } else {
        setWarnings(data.warnings ?? []);
      }
      setRows(parsedRows.slice(0, IMPORT_ROW_CAP));
    } catch {
      setError("We couldn't read this statement. Check your connection and try again.");
    } finally {
      setIsParsing(false);
    }
  }

  function handleFile(file: File) {
    setFileName(file.name);
    setError(null);
    setWarnings([]);

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "csv") {
      handleCsvFile(file);
      return;
    }

    const mimeType = extension ? STATEMENT_MIME_TYPES[extension] : undefined;
    if (!mimeType) {
      setError("Unsupported file type. Upload a CSV, Excel (.xlsx/.xls), or PDF bank statement.");
      return;
    }
    void handleStatementFile(file, mimeType);
  }

  async function handleImport() {
    if (!rows) return;
    await importTransactions(rows, fileName);
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
        ) : isParsing ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-ink">Reading {fileName}...</p>
            <p className="mt-1 text-xs text-ink/50">This can take a little longer for PDF statements.</p>
          </div>
        ) : rows ? (
          <div>
            <p className="text-sm text-ink/65">
              {fileName} — {rows.length} rows ready to import.
            </p>
            {error && <p className="mt-2 text-xs text-alert">{error}</p>}
            {warnings.length > 0 && (
              <div className="mt-2 space-y-1 rounded-lg bg-alert/10 p-2">
                {warnings.map((w, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs text-alert">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {w}
                  </p>
                ))}
              </div>
            )}
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
                      <td className="p-2 text-right numeral">{r.amount.toLocaleString()}</td>
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
              accept=".csv,.xlsx,.xls,.pdf"
              label="Drop your bank statement here, or click to browse"
              hint="CSV, Excel, or PDF — we'll figure out the columns automatically"
              onFile={handleFile}
            />
            {error && <p className="mt-3 text-xs text-alert">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // reader.result is a data URL ("data:<mime>;base64,<data>") — strip
      // the prefix, the server only wants the raw base64 payload.
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
