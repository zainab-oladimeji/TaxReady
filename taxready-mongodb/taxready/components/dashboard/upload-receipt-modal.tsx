"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertTriangle } from "lucide-react";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { Button } from "@/components/ui/button";
import { useTaxReadyData } from "@/components/providers/data-provider";
import { formatMoney } from "@/lib/format";
import { Receipt } from "@/types";
import { isAllowedReceiptMimeType, MAX_RECEIPT_FILE_MB, MAX_RECEIPT_FILE_BYTES } from "@/lib/validation/receipt";

const STAGES = ["Analyzing document...", "Extracting financial information...", "Checking transaction match...", "Ready"];

type Mode = "upload" | "processing" | "result" | "error" | "manual";

export function UploadReceiptModal({ onClose }: { onClose: () => void }) {
  const { uploadReceipt, addManualReceipt } = useTaxReadyData();
  const [mode, setMode] = useState<Mode>("upload");
  const [stageIndex, setStageIndex] = useState(-1);
  const [result, setResult] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validateFile(file: File): string | null {
    if (!isAllowedReceiptMimeType(file.type || "image/jpeg")) {
      return "That file type isn't supported. Upload a JPG, PNG, WEBP, HEIC, or PDF.";
    }
    if (file.size > MAX_RECEIPT_FILE_BYTES) {
      return `That file is too large. Please upload a receipt under ${MAX_RECEIPT_FILE_MB}MB.`;
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setMode("error");
      return;
    }

    setMode("processing");
    setStageIndex(0);
    const timers = STAGES.slice(0, -1).map((_, i) => setTimeout(() => setStageIndex(i + 1), (i + 1) * 500));
    try {
      const base64 = await fileToBase64(file);
      const receipt = await uploadReceipt(file.name, file.type || "image/jpeg", base64);
      setTimeout(() => {
        setStageIndex(STAGES.length - 1);
        setResult(receipt);
        setMode("result");
      }, STAGES.length * 500);
    } catch (err) {
      timers.forEach(clearTimeout);
      setError(err instanceof Error ? err.message : "We couldn't process this receipt.");
      setMode("error");
    } finally {
      timers.forEach(clearTimeout);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // reader.result is a data URL like "data:image/jpeg;base64,AAAA…" —
        // the AI provider wants only the raw base64 payload after the comma.
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

        {mode === "upload" && (
          <FileUploader accept="image/*,.pdf" label="Drop a receipt or invoice here" hint="JPG, PNG, PDF or HEIC" onFile={handleFile} />
        )}

        {mode === "processing" && (
          <ul className="space-y-2.5 py-6 text-sm text-ink/70">
            {STAGES.slice(0, -1).map((s, i) => (
              <li key={s} className={`flex items-center gap-2 ${i <= stageIndex ? "opacity-100" : "opacity-30"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {s}
              </li>
            ))}
          </ul>
        )}

        {mode === "error" && (
          <ErrorFallback
            message={error ?? "We couldn't process this receipt."}
            onRetry={() => setMode("upload")}
            onManualEntry={() => setMode("manual")}
          />
        )}

        {mode === "manual" && (
          <ManualEntryForm
            onCancel={() => setMode("upload")}
            onSave={async (fields) => {
              const receipt = await addManualReceipt(fields);
              setResult(receipt);
              setMode("result");
            }}
          />
        )}

        {mode === "result" && result && (
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

function ErrorFallback({
  message,
  onRetry,
  onManualEntry
}: {
  message: string;
  onRetry: () => void;
  onManualEntry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <AlertTriangle size={28} className="text-alert" />
      <p className="text-sm text-ink/70">{message}</p>
      <div className="flex w-full gap-2">
        <Button variant="outline" className="flex-1" onClick={onRetry}>
          Try again
        </Button>
        <Button className="flex-1" onClick={onManualEntry}>
          Enter manually
        </Button>
      </div>
    </div>
  );
}

function ManualEntryForm({
  onCancel,
  onSave
}: {
  onCancel: () => void;
  onSave: (fields: {
    merchant?: string;
    date?: string;
    amount?: number;
    vatAmount?: number;
    currency?: string;
    category?: string;
    paymentMethod?: string;
  }) => Promise<void>;
}) {
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        merchant: merchant || undefined,
        date: date || undefined,
        amount: amount ? Number(amount) : undefined,
        category: category || undefined,
        currency: "NGN"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save this receipt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3 py-2" onSubmit={handleSubmit}>
      <p className="text-xs text-ink/55">Enter what you can — leave anything you&apos;re unsure of blank.</p>
      <input
        placeholder="Merchant"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
      />
      <input
        type="date"
        placeholder="Date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
      />
      <input
        type="number"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
      />
      <input
        placeholder="Category (e.g. Supplies, Transport)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
      />
      {error && <p className="text-xs text-alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          Save receipt
        </Button>
      </div>
    </form>
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
