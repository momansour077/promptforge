import type { TextareaHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

export const Textarea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "min-h-[160px] w-full rounded-[28px] border border-[rgba(183,208,255,0.14)] bg-[linear-gradient(180deg,rgba(8,12,20,0.72),rgba(11,16,26,0.54))] px-4 py-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)] focus:border-[#7bc8ff] focus:ring-2 focus:ring-[#7bc8ff]/20",
      className
    )}
    {...props}
  />
);
