import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import clsx from "clsx";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "neutral" | "warning" | "success";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <span
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            tone === "warning" ? "bg-clay/15 text-alert" : tone === "success" ? "bg-brand-100 text-brand-700" : "bg-sand text-ink/60"
          )}
        >
          <Icon size={18} />
        </span>
        <div>
          <p className="text-xs text-ink/45">{label}</p>
          <p className="numeral font-display text-2xl text-ink">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
