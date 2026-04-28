import { cn } from "../../utils/cn";

export const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cn("animate-pulse rounded-2xl bg-white/8", className)}
  />
);

