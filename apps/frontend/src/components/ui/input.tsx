import type { InputHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "h-11 w-full rounded-[20px] border border-[rgba(183,208,255,0.14)] bg-[rgba(8,12,20,0.5)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)] focus:border-[#7bc8ff] focus:ring-2 focus:ring-[#7bc8ff]/20",
      className
    )}
    {...props}
  />
);
