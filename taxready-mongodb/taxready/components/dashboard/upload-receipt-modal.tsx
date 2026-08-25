"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { Button } from "@/components/ui/button";
import { useTaxReadyData } from "@/components/providers/data-provider";
import { formatMoney } from "@/lib/format";
import { Receipt } from "@/types";

const STAGES = ["Analyzing document...", "Extracting financial information...", "Checking transaction match...", "Ready"];

export function UploadReceiptModal({ onClose }: { onClose: () => void }) {
  const { uploadReceipt } = useTaxReadyData();
  const [stageIndex, setStageIndex] = useState(-1);
  const [result, setResult] = useState<Receipt | null>(null);

  async function handleFile(file: File) {
    setStageIndex(0);
    const timers = STAGES.slice(0, -1).map((_, i) => setTimeout(() => setStageIndex(i + 1), (i + 1) * 500));
    try {
      const base64 = await fileToBase64(file);
      const receipt = await uploadReceipt(file.name, file.type || "image/jpeg", base64);
      setTimeout(() => {
        setStageIndex(STAGES.length - 1);
        setResult(receipt);
      }, STAGES.length * 500);
    } finally {
      timers.forEach(clearTimeout);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // reader.result is a data URL like "data:image/jpeg;base64,AAAA…" —
        // Gemini wants only the raw base64 payload after the comma.
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(new Error("Could not read the file."));
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-xl2 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Upload receipt</h2>
          <button onClick={onClose} className="focus-ring rounded-full p-1 text-ink/50 hover:bg-sand" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {stageIndex === -1 && (
          <FileUploader accept="image/*,.pdf" label="Drop a receipt or invoice here" hint="JPG, PNG, PDF or HEIC" onFile={handleFile} />
        )}

        {stageIndex >= 0 && !result && (
          <ul className="space-y-2.5 py-6 text-sm text-ink/70">
            {STAGES.slice(0, -1).map((s, i) => (
              <li key={s} className={`flex items-center gap-2 ${i <= stageIndex ? "opacity-100" : "opacity-30"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {s}
              </li>
            ))}
          </ul>
        )}

        {result && (
          <div className="space-y-3 py-2">
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line p-4 text-sm">
              <Row label="Merchant" value={result.merchant ?? "—"} />
              <Row label="Date" value={result.date ?? "—"} />
              <Row label="Amount" value={result.amount ? formatMoney(result.amount, result.currency) : "—"} />
              <Row label="VAT" value={result.vatAmount ? formatMoney(result.vatAmount, result.currency) : "—"} />
              <Row label="Category" value={result.category ?? "—"} />
              <Row label="Payment method" value={result.paymentMethod ?? "—"} />
            </dl>
            <p className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
              <CheckCircle2 size={15} /> Added to your records.
            </p>
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink/45">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
