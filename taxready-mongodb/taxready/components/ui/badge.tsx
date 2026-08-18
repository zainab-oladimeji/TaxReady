import clsx from "clsx";
import { HTMLAttributes } from "react";

type Tone = "neutral" | "success" | "warning" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-sand text-ink/70",
  success: "bg-brand-100 text-brand-700",
  warning: "bg-clay/15 text-alert",
  info: "bg-brand-50 text-brand-600"
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
