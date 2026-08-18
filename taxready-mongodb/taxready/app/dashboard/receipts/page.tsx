"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadReceiptModal } from "@/components/dashboard/upload-receipt-modal";
import { useTaxReadyData } from "@/components/providers/data-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { Receipt as ReceiptIcon, UploadCloud, Link2 } from "lucide-react";

export default function ReceiptsPage() {
  const { receipts } = useTaxReadyData();
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <Topbar title="Receipts" />
      <div className="p-5 md:p-8">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-ink/55">{receipts.length.toLocaleString()} receipts on file, extracted with Gemini.</p>
          <Button onClick={() => setShowUpload(true)}>
            <UploadCloud size={16} /> Upload Receipt
          </Button>
        </div>

        {receipts.length === 0 ? (
          <EmptyReceipts onUpload={() => setShowUpload(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {receipts.slice(0, 60).map((r) => (
              <Card key={r.id}>
                <CardContent>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <ReceiptIcon size={15} />
                    </span>
                    {r.transactionId ? (
                      <Badge tone="success">
                        <Link2 size={11} /> Matched
                      </Badge>
                    ) : (
                      <Badge tone="warning">Needs review</Badge>
                    )}
                  </div>
                  <p className="truncate font-medium text-ink">{r.merchant ?? "Unknown merchant"}</p>
                  <p className="text-xs text-ink/45">{r.date ? formatDate(r.date) : "—"}</p>
                  <p className="numeral mt-2 font-display text-lg text-ink">{r.amount ? formatMoney(r.amount, r.currency) : "—"}</p>
                  <p className="mt-1 text-xs text-ink/45">{r.category ?? "Uncategorized"}</p>
                  <p className="mt-3 text-xs text-ink/35">AI confidence {r.aiConfidence ? `${Math.round(r.aiConfidence * 100)}%` : "—"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {showUpload && <UploadReceiptModal onClose={() => setShowUpload(false)} />}
    </>
  );
}

function EmptyReceipts({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-dashed border-line bg-white py-16 text-center">
      <ReceiptIcon size={28} className="mb-3 text-ink/25" />
      <p className="font-medium text-ink">Your receipts will appear here once you upload them.</p>
      <Button className="mt-4" onClick={onUpload}>
        Upload your first receipt
      </Button>
    </div>
  );
}
