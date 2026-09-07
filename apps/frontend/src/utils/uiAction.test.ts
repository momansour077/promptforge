import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { uiAction } from "./uiAction";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("uiAction", () => {
  it("returns void and forwards event arguments", async () => {
    const action = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined);
    expect(uiAction(action, "Failed")("collection-1")).toBeUndefined();
    await vi.waitFor(() => expect(action).toHaveBeenCalledWith("collection-1"));
  });

  it("reports a rejected promise instead of leaving an unhandled rejection", async () => {
    const action = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("Request failed"));
    uiAction(action, "Failed")();
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Request failed"));
  });

  it("reports non-Error promise rejections using the safe fallback", async () => {
    const action = vi.fn<() => Promise<void>>().mockRejectedValue(null);
    uiAction(action, "Try again")();
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Try again"));
  });

  it("reports synchronous exceptions", async () => {
    uiAction(() => { throw new Error("Synchronous failure"); }, "Try again")();
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Synchronous failure"));
  });
});
