import type { HTMLAttributes } from "react";

import { cn } from "../../utils/cn";

export const Badge = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[var(--text-secondary)]",
      className
    )}
    {...props}
  />
);

