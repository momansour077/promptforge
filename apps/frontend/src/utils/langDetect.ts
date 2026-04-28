import { franc } from "franc";

import type { Language } from "../types";

const ARABIC_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/u;

export const detectLanguage = (input: string): Language => {
  const value = input.trim();

  if (!value) {
    return "en";
  }

  if (ARABIC_PATTERN.test(value)) {
    return "ar";
  }

  if (value.length < 5) {
    return "en";
  }

  return franc(value, { minLength: 3 }) === "arb" ? "ar" : "en";
};

