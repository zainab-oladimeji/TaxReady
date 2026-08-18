import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-base text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-ink/45">{subtitle}</p>}
      </CardHeader>
      <CardContent className="pt-3">{children}</CardContent>
    </Card>
  );
}
