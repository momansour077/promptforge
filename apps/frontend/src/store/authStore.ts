import { create } from "zustand";

import type { UserProfile } from "../types";

interface AuthState {
  user: UserProfile | null;
  status: "idle" | "loading" | "authenticated" | "guest";
  setUser: (user: UserProfile | null) => void;
  setStatus: (status: AuthState["status"]) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "guest"
    }),
  setStatus: (status) => set({ status }),
  clearAuth: () =>
    set({
      user: null,
      status: "guest"
    })
}));

