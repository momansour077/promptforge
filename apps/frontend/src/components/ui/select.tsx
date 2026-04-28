import type { SelectHTMLAttributes } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "../../utils/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = ({ className, children, ...props }: SelectProps) => (
  <div className="relative">
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-[20px] border border-[rgba(183,208,255,0.14)] bg-[rgba(8,12,20,0.5)] px-4 pr-10 text-sm text-[var(--text-primary)] outline-none transition focus:border-[#7bc8ff] focus:ring-2 focus:ring-[#7bc8ff]/20",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
  </div>
);
