import { create } from "zustand";

import type { Language, ThemeMode } from "../types";

const THEME_STORAGE_KEY = "promptforge-theme";
const LANGUAGE_STORAGE_KEY = "promptforge-language";

const getStoredValue = <TValue extends string>(
  key: string,
  fallback: TValue
): TValue => {
  if (typeof window === "undefined") {
    return fallback;
  }

  return (window.localStorage.getItem(key) as TValue | null) ?? fallback;
};

interface UIState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  language: Language;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarOpen: (value: boolean) => void;
  setLanguage: (language: Language) => void;
}

const initialTheme = getStoredValue<ThemeMode>(THEME_STORAGE_KEY, "dark");
const initialLanguage = getStoredValue<Language>(LANGUAGE_STORAGE_KEY, "en");

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme,
  sidebarOpen: false,
  language: initialLanguage,
  setTheme: (theme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    set({ theme: nextTheme });
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setLanguage: (language) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    set({ language });
  }
}));
