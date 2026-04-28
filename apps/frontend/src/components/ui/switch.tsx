import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "../../utils/cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = ({ checked, onCheckedChange }: SwitchProps) => (
  <SwitchPrimitives.Root
    checked={checked}
    onCheckedChange={onCheckedChange}
    className={cn(
      "relative h-6 w-11 rounded-full border border-[rgba(183,208,255,0.14)] transition",
      checked ? "bg-[linear-gradient(135deg,#6a7cff,#57b8ff)]" : "bg-white/10"
    )}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "block size-5 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-5" : "translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
);
