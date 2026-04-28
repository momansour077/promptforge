import type { Language } from "../types";

export const isRtlLanguage = (language: Language): boolean => language === "ar";

export const applyDocumentLanguage = (language: Language): void => {
  document.documentElement.lang = language;
  document.documentElement.dir = isRtlLanguage(language) ? "rtl" : "ltr";
};

export const formatLocalizedNumber = (value: number, language: Language): string =>
  new Intl.NumberFormat(language === "ar" ? "ar" : "en-US").format(value);

export const formatLocalizedDate = (value: string | Date, language: Language): string =>
  new Intl.DateTimeFormat(language === "ar" ? "ar" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(typeof value === "string" ? new Date(value) : value);

