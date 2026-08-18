"use client";

import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTaxReadyData } from "@/components/providers/data-provider";
import { Trash2, Download, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const { business } = useTaxReadyData();

  return (
    <>
      <Topbar title="Settings" />
      <div className="max-w-2xl space-y-6 p-5 md:p-8">
        <Card>
          <CardContent>
            <h2 className="font-display text-lg text-ink">Business profile</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Business name" value={business.name} />
              <Field label="Business type" value={business.type} />
              <Field label="Country" value="Nigeria" />
              <Field label="Currency" value={business.currency} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="flex items-center gap-2 font-display text-lg text-ink">
              <ShieldCheck size={17} className="text-brand-600" /> Privacy &amp; data
            </h2>
            <p className="mt-1 text-sm text-ink/55">Your financial data belongs to you. Export or remove it anytime.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" size="sm">
                <Download size={14} /> Export all data
              </Button>
              <Button variant="outline" size="sm" className="border-alert/40 text-alert hover:border-alert">
                <Trash2 size={14} /> Delete business
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="font-display text-lg text-ink">AI processing</h2>
            <p className="mt-1 text-sm text-ink/55">
              TaxReady uses your transactions and receipts to power classification and the AI assistant. Your
              data is never used as context for another business.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs text-ink/45">{label}</label>
      <input readOnly value={value} className="focus-ring mt-1 w-full rounded-lg border border-line bg-sand/40 px-3 py-2 text-sm text-ink" />
    </div>
  );
}
