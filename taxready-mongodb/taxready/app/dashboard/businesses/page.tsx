"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus, X } from "lucide-react";
import { useTaxReadyData } from "@/components/providers/data-provider";
import { Business, BusinessType, CountryCode } from "@/types";
import { COUNTRY_TAX_CONFIGS } from "@/lib/tax/country-rules";

const BUSINESS_TYPES: BusinessType[] = [
  "Retail",
  "Food & Beverage",
  "Professional Services",
  "Technology",
  "Manufacturing",
  "Other"
];

export default function BusinessesPage() {
  const { business: activeBusiness } = useTaxReadyData();
  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  async function loadBusinesses() {
    const res = await fetch("/api/businesses");
    if (res.ok) {
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
    }
  }

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function handleSwitch(businessId: string) {
    setSwitching(businessId);
    try {
      const res = await fetch("/api/businesses/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId })
      });
      if (res.ok) {
        // A full reload is the simplest correct way to refresh every
        // business-scoped screen (transactions, receipts, reports,
        // readiness) at once, rather than re-plumbing global state.
        window.location.reload();
      }
    } finally {
      setSwitching(null);
    }
  }

  return (
    <>
      <Topbar title="Businesses" />
      <div className="space-y-4 p-5 md:p-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink/55">Manage every business you run from one TaxReady account.</p>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add business
          </Button>
        </div>

        {businesses === null && <p className="py-8 text-center text-sm text-ink/45">Loading…</p>}

        {businesses !== null &&
          businesses.map((b) => {
            const isActive = b.id === activeBusiness.id;
            return (
              <Card key={b.id} className={isActive ? "border-brand-200 ring-1 ring-brand-200" : undefined}>
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${isActive ? "bg-brand-50 text-brand-600" : "bg-sand text-ink/50"}`}
                    >
                      <Building2 size={18} />
                    </span>
                    <div>
                      <p className="font-medium text-ink">{b.name}</p>
                      <p className="text-xs text-ink/45">
                        {b.type} · {COUNTRY_TAX_CONFIGS[b.country]?.countryName ?? b.country}
                      </p>
                    </div>
                  </div>
                  {isActive ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={switching === b.id} onClick={() => handleSwitch(b.id)}>
                      {switching === b.id ? "Switching…" : "Switch to"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

        <p className="pt-2 text-xs text-ink/40">
          Every record is scoped to a business by <code className="rounded bg-sand px-1 py-0.5">businessId</code>,
          enforced server-side — not just filtered in the browser.
        </p>
      </div>

      {showAdd && (
        <AddBusinessModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            loadBusinesses();
          }}
        />
      )}
    </>
  );
}

function AddBusinessModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType>("Retail");
  const [country, setCountry] = useState<CountryCode>("NG");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const currency = COUNTRY_TAX_CONFIGS[country]?.currency ?? "NGN";
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, country, currency })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't add this business.");
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this business.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-ink">Add a business</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            required
            placeholder="Business name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as BusinessType)}
            className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
          >
            {Object.values(COUNTRY_TAX_CONFIGS).map((c) => (
              <option key={c.countryCode} value={c.countryCode}>
                {c.countryName}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            Add business
          </Button>
        </form>
      </div>
    </div>
  );
}
