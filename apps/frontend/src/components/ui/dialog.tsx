import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../utils/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = ({
  children,
  title,
  description
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
    <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/10 bg-[var(--bg)] p-6 text-[var(--text-primary)] shadow-glow outline-none">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <DialogPrimitive.Title className="font-heading text-3xl">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-2 text-sm text-[var(--text-secondary)]">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
        <DialogPrimitive.Close className="rounded-full p-2 text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </div>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);

export const DialogFooter = ({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) => <div className={cn("mt-6 flex justify-end gap-3", className)}>{children}</div>;

