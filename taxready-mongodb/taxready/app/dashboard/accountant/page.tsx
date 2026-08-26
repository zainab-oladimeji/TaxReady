"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, AlertTriangle, FileWarning, Mail, X, UserPlus } from "lucide-react";
import { AccountantClient, AccountantClientStatus } from "@/types";

const STATUS_TONE: Record<AccountantClientStatus, "success" | "warning" | "info"> = {
  "Ready for review": "success",
  "Needs attention": "warning",
  "Missing records": "warning"
};

export default function AccountantPage() {
  const [clients, setClients] = useState<AccountantClient[] | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  async function loadClients() {
    const res = await fetch("/api/accountant/clients");
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients ?? []);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const ready = (clients ?? []).filter((c) => c.status === "Ready for review").length;
  const attention = (clients ?? []).filter((c) => c.status === "Needs attention").length;
  const missing = (clients ?? []).filter((c) => c.status === "Missing records").length;

  return (
    <>
      <Topbar title="Accountant Dashboard" />
      <div className="space-y-6 p-5 md:p-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink/55">A separate workspace for accountants managing multiple client businesses.</p>
          <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
            <Mail size={14} /> Invite client
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Clients" value={String(clients?.length ?? 0)} icon={Users} />
          <StatCard label="Ready for Review" value={String(ready)} icon={CheckCircle2} tone="success" />
          <StatCard label="Needs Attention" value={String(attention)} icon={AlertTriangle} tone="warning" />
          <StatCard label="Missing Records" value={String(missing)} icon={FileWarning} tone="warning" />
        </div>

        <Card>
          <CardContent>
            <h2 className="mb-4 font-display text-lg text-ink">Clients</h2>

            {clients === null && <p className="py-8 text-center text-sm text-ink/45">Loading…</p>}

            {clients !== null && clients.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <UserPlus size={28} className="text-ink/30" />
                <p className="text-sm text-ink/55">No clients yet. Invite one to start tracking their bookkeeping.</p>
                <Button size="sm" onClick={() => setShowInvite(true)}>
                  <Mail size={14} /> Invite your first client
                </Button>
              </div>
            )}

            {clients !== null && clients.length > 0 && (
              <div className="divide-y divide-line">
                {clients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-ink/45">{c.email}</p>
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
            )}
          </CardContent>
        </Card>
      </div>

      {showInvite && (
        <InviteClientModal
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            setShowInvite(false);
            loadClients();
          }}
        />
      )}
    </>
  );
}

function InviteClientModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accountant/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't send the invite.");
      }
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the invite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-ink">Invite a client</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            required
            placeholder="Client or business name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
          />
          <input
            type="email"
            required
            placeholder="Client's email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
          />
          {error && <p className="text-xs text-alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            Send invite
          </Button>
        </form>
      </div>
    </div>
  );
}
