import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-brand-800",
  secondary: "bg-brand-500 text-white hover:bg-brand-600",
  outline: "border border-line bg-transparent text-ink hover:border-ink",
  ghost: "bg-transparent text-ink hover:bg-sand"
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-full",
  md: "text-sm px-4 py-2.5 rounded-full",
  lg: "text-base px-6 py-3.5 rounded-full"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "focus-ring inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
