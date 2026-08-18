"use client";

import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, AlertTriangle, FileWarning, Mail } from "lucide-react";
import { DEMO_ACCOUNTANT_CLIENTS } from "@/lib/data/demo-data";

const STATUS_TONE: Record<string, "success" | "warning" | "info"> = {
  "Ready for review": "success",
  "Needs attention": "warning",
  "Missing records": "warning"
};

export default function AccountantPage() {
  const ready = DEMO_ACCOUNTANT_CLIENTS.filter((c) => c.status === "Ready for review").length;
  const attention = DEMO_ACCOUNTANT_CLIENTS.filter((c) => c.status === "Needs attention").length;
  const missing = DEMO_ACCOUNTANT_CLIENTS.filter((c) => c.status === "Missing records").length;

  return (
    <>
      <Topbar title="Accountant Dashboard" />
      <div className="space-y-6 p-5 md:p-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink/55">A separate workspace for accountants managing multiple client businesses.</p>
          <Button size="sm" variant="outline">
            <Mail size={14} /> Invite client
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Clients" value={String(DEMO_ACCOUNTANT_CLIENTS.length)} icon={Users} />
          <StatCard label="Ready for Review" value={String(ready)} icon={CheckCircle2} tone="success" />
          <StatCard label="Needs Attention" value={String(attention)} icon={AlertTriangle} tone="warning" />
          <StatCard label="Missing Records" value={String(missing)} icon={FileWarning} tone="warning" />
        </div>

        <Card>
          <CardContent>
            <h2 className="mb-4 font-display text-lg text-ink">Clients</h2>
            <div className="divide-y divide-line">
              {DEMO_ACCOUNTANT_CLIENTS.map((c) => (
                <div key={c.name} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="text-xs text-ink/45">Nigeria · Retail</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                    <Button size="sm" variant="ghost">
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
