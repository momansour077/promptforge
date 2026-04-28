import { startTransition, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useUIStore } from "../store/uiStore";
import type { Language } from "../types";
import { applyDocumentLanguage } from "../utils/rtl";

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const language = useUIStore((state) => state.language);
  const setLanguageState = useUIStore((state) => state.setLanguage);

  useEffect(() => {
    applyDocumentLanguage(language);
    void i18n.changeLanguage(language);
  }, [i18n, language]);

  const setLanguage = (nextLanguage: Language) => {
    startTransition(() => {
      setLanguageState(nextLanguage);
    });
  };

  return {
    language,
    setLanguage
  };
};

