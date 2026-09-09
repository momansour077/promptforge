import { toast } from "sonner";

/** React event handlers return void; report rejected async work to the user. */
export const uiAction = <Args extends unknown[]>(
  action: (...args: Args) => void | Promise<unknown>,
  fallback: string
): ((...args: Args) => void) => (...args) => {
  void Promise.resolve().then(() => action(...args)).catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : fallback);
  });
};
