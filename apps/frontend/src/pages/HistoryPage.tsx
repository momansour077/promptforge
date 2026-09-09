import { useDeferredValue, useMemo } from "react";

import { useTranslation } from "react-i18next";

import { HistoryList } from "../components/history/HistoryList";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { useHistory } from "../hooks/useHistory";
import { uiAction } from "../utils/uiAction";
import type { Language, PromptType } from "../types";
import { formatPromptTypeLabel } from "../utils/promptLabels";

const historyPromptTypeOptions: readonly PromptType[] = [
  "GENERAL",
  "BUSINESS",
  "CODE_GENERATION",
  "CREATIVE_WRITING"
] as const;

export const HistoryPage = () => {
  const { t, i18n } = useTranslation();
  const locale: Language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const {
    items,
    loading,
    regeneratingId,
    filters,
    setFilter,
    regeneratePrompt,
    toggleFavorite,
    removePrompt
  } = useHistory();
  const deferredSearch = useDeferredValue(filters.search);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.rawInput.toLowerCase().includes(deferredSearch.toLowerCase().trim())
      ),
    [deferredSearch, items]
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="eyebrow">Archive</p>
        <h1 className="mt-2 font-heading text-6xl">{t("history.title")}</h1>
        <p className="mt-3 text-[var(--text-secondary)]">{t("history.subtitle")}</p>
      </div>

      <Card className="grid gap-4 md:grid-cols-4">
        <Input
          placeholder={t("common.search")}
          value={filters.search}
          onChange={(event) => setFilter("search", event.target.value)}
        />
        <Select value={filters.promptType ?? ""} onChange={(event) => setFilter("promptType", event.target.value || undefined)}>
          <option value="">{t("history.filters.type")}</option>
          {historyPromptTypeOptions.map((promptType) => (
            <option key={promptType} value={promptType}>
              {formatPromptTypeLabel(promptType, locale)}
            </option>
          ))}
        </Select>
        <Select value={filters.language ?? ""} onChange={(event) => setFilter("language", event.target.value || undefined)}>
          <option value="">{t("history.filters.language")}</option>
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </Select>
        <Select value={filters.sortBy} onChange={(event) => setFilter("sortBy", event.target.value as typeof filters.sortBy)}>
          <option value="newest">{t("history.sortNewest")}</option>
          <option value="oldest">{t("history.sortOldest")}</option>
          <option value="most_tokens">{t("history.sortTokens")}</option>
        </Select>
      </Card>

      <HistoryList
        items={filteredItems}
        loading={loading}
        regeneratingId={regeneratingId}
        onRegenerate={uiAction(regeneratePrompt, t("errors.generic"))}
        onToggleFavorite={uiAction(toggleFavorite, t("errors.generic"))}
        onDelete={uiAction(removePrompt, t("errors.generic"))}
      />
    </section>
  );
};
