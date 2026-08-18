export function formatMoney(amount: number, currency = "NGN"): string {
  const symbols: Record<string, string> = { NGN: "₦", GHS: "₵", KES: "KSh", ZAR: "R", GBP: "£" };
  const symbol = symbols[currency] ?? currency + " ";
  return `${symbol}${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
