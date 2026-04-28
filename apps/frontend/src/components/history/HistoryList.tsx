import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { PromptRecord } from "../../types";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { HistoryItem } from "./HistoryItem";

interface HistoryListProps {
  items: PromptRecord[];
  loading: boolean;
  regeneratingId: string | null;
  onRegenerate: (promptId: string) => void;
  onToggleFavorite: (promptId: string) => void;
  onDelete: (promptId: string) => void;
}

export const HistoryList = ({
  items,
  loading,
  regeneratingId,
  onRegenerate,
  onToggleFavorite,
  onDelete
}: HistoryListProps) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="space-y-3 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <span className="text-2xl">✦</span>
        </div>
        <h3 className="font-heading text-4xl">{t("history.emptyTitle")}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{t("history.emptyBody")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((prompt) => (
        <HistoryItem
          key={prompt.id}
          prompt={prompt}
          expanded={expandedId === prompt.id}
          regenerating={regeneratingId === prompt.id}
          onExpand={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
          onRegenerate={() => void onRegenerate(prompt.id)}
          onToggleFavorite={() => void onToggleFavorite(prompt.id)}
          onDelete={() => void onDelete(prompt.id)}
        />
      ))}
    </div>
  );
};
