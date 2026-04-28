import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../../utils/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "glass section-sheen water-panel rounded-[30px] p-5",
        className
      )}
      {...props}
    />
  )
);

Card.displayName = "Card";
