import { franc } from "franc";

import type { SupportedLanguage } from "../types/index.js";

const ARABIC_SCRIPT_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/u;

export class LangService {
  public detectLanguage(input: string, fallback: SupportedLanguage = "en"): SupportedLanguage {
    const normalized = input.trim();

    if (!normalized) {
      return fallback;
    }

    if (ARABIC_SCRIPT_PATTERN.test(normalized)) {
      return "ar";
    }

    if (normalized.length < 5) {
      return fallback;
    }

    const detected = franc(normalized, {
      minLength: 3
    });

    return detected === "arb" ? "ar" : "en";
  }
}

export const langService = new LangService();

