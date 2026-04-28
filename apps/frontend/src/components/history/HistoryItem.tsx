import { Heart, LoaderCircle, RefreshCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PromptRecord } from "../../types";
import { formatPromptTypeLabel } from "../../utils/promptLabels";
import { formatLocalizedDate } from "../../utils/rtl";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface HistoryItemProps {
  prompt: PromptRecord;
  expanded: boolean;
  regenerating: boolean;
  onExpand: () => void;
  onRegenerate: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

export const HistoryItem = ({
  prompt,
  expanded,
  regenerating,
  onExpand,
  onRegenerate,
  onToggleFavorite,
  onDelete
}: HistoryItemProps) => {
  const { t } = useTranslation();
  const language = prompt.detectedLang;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <button type="button" className="text-left" onClick={onExpand}>
            <p className="line-clamp-2 text-lg font-medium text-[var(--text-primary)]">{prompt.rawInput}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {formatLocalizedDate(prompt.createdAt, prompt.detectedLang)}
            </p>
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onRegenerate}
            disabled={regenerating}
            aria-label={t("history.regenerate")}
            title={t("history.regenerate")}
          >
            {regenerating ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
          </Button>
          <Button type="button" variant="ghost" onClick={onToggleFavorite}>
            <Heart className={`size-4 ${prompt.isFavorited ? "fill-danger text-danger" : ""}`} />
          </Button>
          <Button type="button" variant="ghost" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>{formatPromptTypeLabel(prompt.promptType, language)}</Badge>
        <Badge>{prompt.detectedLang.toUpperCase()}</Badge>
        <Badge>{prompt.tokensUsed} tokens</Badge>
      </div>

      {expanded ? (
        <div className="rounded-[22px] border border-white/10 bg-[#09090b] p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm text-warm">{prompt.outputPrompt}</pre>
        </div>
      ) : null}
    </Card>
  );
};
