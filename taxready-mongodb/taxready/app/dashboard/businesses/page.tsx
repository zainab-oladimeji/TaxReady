"use client";

import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import { useTaxReadyData } from "@/components/providers/data-provider";

const OTHER_BUSINESSES = [
  { name: "Zed Foods", type: "Food & Beverage" },
  { name: "Adeola Consulting", type: "Professional Services" }
];

export default function BusinessesPage() {
  const { business } = useTaxReadyData();

  return (
    <>
      <Topbar title="Businesses" />
      <div className="space-y-4 p-5 md:p-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink/55">Manage every business you run from one TaxReady account.</p>
          <Button size="sm">
            <Plus size={14} /> Add business
          </Button>
        </div>

        <Card className="border-brand-200 ring-1 ring-brand-200">
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Building2 size={18} />
              </span>
              <div>
                <p className="font-medium text-ink">{business.name}</p>
                <p className="text-xs text-ink/45">
                  {business.type} · {business.state}, Nigeria
                </p>
              </div>
            </div>
            <Badge tone="success">Active</Badge>
          </CardContent>
        </Card>

        {OTHER_BUSINESSES.map((b) => (
          <Card key={b.name}>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand text-ink/50">
                  <Building2 size={18} />
                </span>
                <div>
                  <p className="font-medium text-ink">{b.name}</p>
                  <p className="text-xs text-ink/45">{b.type} · Nigeria</p>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                Switch to
              </Button>
            </CardContent>
          </Card>
        ))}

        <p className="pt-2 text-xs text-ink/40">
          Every record is scoped to a business by <code className="rounded bg-sand px-1 py-0.5">businessId</code>,
          enforced server-side — not just filtered in the browser.
        </p>
      </div>
    </>
  );
}
