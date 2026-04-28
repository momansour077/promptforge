import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[linear-gradient(135deg,#6a7cff_0%,#4f8bff_45%,#63cfff_100%)] text-white shadow-glow hover:scale-[1.01] hover:brightness-110 disabled:bg-accent-muted",
  secondary:
    "border-[rgba(183,208,255,0.14)] bg-[rgba(10,15,27,0.52)] text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.08)] disabled:bg-[var(--bg-muted)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
  danger: "bg-danger text-white hover:bg-red-400"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xl px-3 text-sm",
  md: "h-11 rounded-2xl px-4 text-sm",
  lg: "h-12 rounded-2xl px-5 text-sm"
};

export const Button = ({
  asChild,
  className,
  variant = "primary",
  size = "md",
  leadingIcon,
  children,
  ...props
}: ButtonProps) => {
  const Component = asChild ? Slot : "button";
  const sharedClassName = cn(
    "inline-flex items-center justify-center gap-2 border border-transparent font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (asChild) {
    return (
      <Component className={sharedClassName} {...props}>
        {children}
      </Component>
    );
  }

  return (
    <Component
      className={sharedClassName}
      {...props}
    >
      {leadingIcon}
      {children}
    </Component>
  );
};
