import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import type { PromptRecord } from "../../types";
import { formatPromptTypeLabel, formatTargetAiLabel } from "../../utils/promptLabels";
import { formatLocalizedDate } from "../../utils/rtl";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

interface PromptCardProps {
  prompt: PromptRecord;
  draggableId?: string;
}

export const PromptCard = ({ prompt, draggableId }: PromptCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId ?? prompt.id,
    disabled: !draggableId
  });
  const language = prompt.detectedLang;

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.6 : 1
      }}
      className="space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="line-clamp-2 font-medium text-[var(--text-primary)]">{prompt.rawInput}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {formatLocalizedDate(prompt.createdAt, prompt.detectedLang)}
          </p>
        </div>
        {draggableId ? (
          <button
            type="button"
            className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-white/5"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>{formatPromptTypeLabel(prompt.promptType, language)}</Badge>
        <Badge>{formatTargetAiLabel(prompt.targetAI, language)}</Badge>
      </div>
    </Card>
  );
};
