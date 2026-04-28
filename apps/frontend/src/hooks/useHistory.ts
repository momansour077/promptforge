import { startTransition, useEffect, useState } from "react";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { historyService } from "../services/historyService";
import type { ApiError, PromptRecord } from "../types";

interface HistoryFilters {
  search: string;
  promptType?: string;
  language?: string;
  favorited?: boolean;
  sortBy: "newest" | "oldest" | "most_tokens";
}

export const useHistory = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PromptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({
    search: "",
    sortBy: "newest"
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const response = await historyService.list({
          page: "1",
          limit: "50",
          promptType: filters.promptType,
          language: filters.language,
          favorited: filters.favorited ? "true" : undefined,
          sortBy: filters.sortBy
        });

        setItems(response.data.items);
      } catch (caughtError) {
        const apiError = caughtError as ApiError;
        toast.error(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [filters.favorited, filters.language, filters.promptType, filters.sortBy]);

  const setFilter = <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        [key]: value
      }));
    });
  };

  const toggleFavorite = async (promptId: string) => {
    const currentItems = items;
    setItems((existing) =>
      existing.map((item) =>
        item.id === promptId ? { ...item, isFavorited: !item.isFavorited } : item
      )
    );

    try {
      await historyService.toggleFavorite(promptId);
      toast.success(t("toast.favoriteUpdated"));
    } catch (caughtError) {
      setItems(currentItems);
      const apiError = caughtError as ApiError;
      toast.error(apiError.message);
    }
  };

  const regeneratePrompt = async (promptId: string) => {
    setRegeneratingId(promptId);

    try {
      const response = await historyService.regenerate(promptId);
      setItems((existing) =>
        existing.map((item) => (item.id === promptId ? response.prompt : item))
      );
      toast.success(t("toast.promptRegenerated"));
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      toast.error(apiError.message);
    } finally {
      setRegeneratingId(null);
    }
  };

  const removePrompt = async (promptId: string) => {
    const currentItems = items;
    setItems((existing) => existing.filter((item) => item.id !== promptId));

    try {
      await historyService.remove(promptId);
      toast.success(t("toast.promptDeleted"));
    } catch (caughtError) {
      setItems(currentItems);
      const apiError = caughtError as ApiError;
      toast.error(apiError.message);
    }
  };

  return {
    items,
    loading,
    regeneratingId,
    filters,
    setFilter,
    regeneratePrompt,
    toggleFavorite,
    removePrompt
  };
};
