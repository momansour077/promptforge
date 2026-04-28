import { Flag, SlidersHorizontal, WandSparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Language, PromptGenerateInput } from "../../types";
import {
  formatPromptTypeOptionLabel,
  formatTargetAiOptionLabel,
  formatToneLabel
} from "../../utils/promptLabels";
import {
  DEFAULT_PROMPT_TYPE,
  DEFAULT_TARGET_AI,
  DEFAULT_TONE,
  hasPromptFormOverrides,
  PROMPT_TYPE_OPTIONS,
  TARGET_AI_OPTIONS,
  TONE_OPTIONS
} from "../../utils/promptForm";
import { formatLocalizedNumber } from "../../utils/rtl";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Select } from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

interface PromptInputProps {
  form: PromptGenerateInput;
  detectedLanguage: "en" | "ar";
  loading: boolean;
  onFieldChange: <K extends keyof PromptGenerateInput>(
    field: K,
    value: PromptGenerateInput[K]
  ) => void;
  onGenerate: () => void;
  onClear: () => void;
}

export const PromptInput = ({
  form,
  detectedLanguage,
  loading,
  onFieldChange,
  onGenerate,
  onClear
}: PromptInputProps) => {
  const { t, i18n } = useTranslation();
  const characterCount = form.rawInput.length;
  const locale: Language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const hasOverrides = hasPromptFormOverrides(form);
  const activeOverrides = [
    form.targetAI !== DEFAULT_TARGET_AI
      ? `${t("dashboard.overrideTargetAI")}: ${formatTargetAiOptionLabel(form.targetAI, locale)}`
      : null,
    form.promptType !== DEFAULT_PROMPT_TYPE
      ? `${t("dashboard.overridePromptType")}: ${formatPromptTypeOptionLabel(form.promptType, locale)}`
      : null,
    form.tone !== DEFAULT_TONE
      ? `${t("dashboard.overrideTone")}: ${formatToneLabel(form.tone, locale)}`
      : null,
    form.includeExamples ? t("dashboard.overrideExamples") : null,
    form.includeChainOfThought ? t("dashboard.overrideReasoning") : null
  ].filter((value): value is string => Boolean(value));

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">
            {t("dashboard.title")}
          </p>
          <h2 className="mt-2 font-heading text-4xl">{t("dashboard.inputLabel")}</h2>
        </div>
        <div className="rounded-[20px] border border-[rgba(183,208,255,0.14)] bg-[rgba(10,15,27,0.46)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Flag className="size-4" />
            <span>{detectedLanguage === "ar" ? "🇦🇪" : "🇬🇧"}</span>
            <span>{t("dashboard.languageDetected")}</span>
          </div>
        </div>
      </div>

      <div>
        <Textarea
          value={form.rawInput}
          placeholder={t("dashboard.inputPlaceholder")}
          onChange={(event) => onFieldChange("rawInput", event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              void onGenerate();
            }

            if (event.key === "Escape") {
              onClear();
            }
          }}
        />
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className={characterCount > 500 ? "text-warning" : "text-[var(--text-secondary)]"}>
            {t("dashboard.characters")}: {formatLocalizedNumber(characterCount, detectedLanguage)}
          </span>
          {characterCount > 500 ? (
            <span className="max-w-xs text-right text-warning">{t("dashboard.charactersWarning")}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {t("dashboard.targetAI")}
          </label>
          <Select
            value={form.targetAI}
            onChange={(event) => onFieldChange("targetAI", event.target.value as PromptGenerateInput["targetAI"])}
          >
            {TARGET_AI_OPTIONS.map((target) => (
              <option key={target} value={target}>
                {formatTargetAiOptionLabel(target, locale)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {t("dashboard.promptType")}
          </label>
          <Select
            value={form.promptType}
            onChange={(event) =>
              onFieldChange("promptType", event.target.value as PromptGenerateInput["promptType"])
            }
          >
            {PROMPT_TYPE_OPTIONS.map((promptType) => (
              <option key={promptType} value={promptType}>
                {formatPromptTypeOptionLabel(promptType, locale)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {t("dashboard.tone")}
          </label>
          <Select value={form.tone} onChange={(event) => onFieldChange("tone", event.target.value)}>
            {TONE_OPTIONS.map((tone) => (
              <option key={tone} value={tone}>
                {formatToneLabel(tone, locale)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-[24px] border border-[rgba(183,208,255,0.12)] bg-[rgba(8,12,20,0.42)] p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <SlidersHorizontal className="size-4" />
              <span>{hasOverrides ? t("dashboard.manualOverrides") : t("dashboard.autoMode")}</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {hasOverrides ? t("dashboard.manualOverridesBody") : t("dashboard.autoModeBody")}
            </p>
          </div>
          <Badge className={hasOverrides ? "border-[#ffcf7b]/30 bg-[#ffcf7b]/10 text-[#ffe1a7]" : ""}>
            {hasOverrides ? t("dashboard.manualOverrides") : t("dashboard.auto")}
          </Badge>
        </div>

        {activeOverrides.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeOverrides.map((override) => (
              <Badge key={override}>{override}</Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 rounded-[24px] border border-[rgba(183,208,255,0.12)] bg-[rgba(8,12,20,0.42)] p-4 md:grid-cols-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-[var(--text-primary)]">{t("dashboard.examples")}</p>
            <p className="text-sm text-[var(--text-secondary)]">{t("dashboard.examplesBody")}</p>
          </div>
          <Switch
            checked={form.includeExamples}
            onCheckedChange={(checked) => onFieldChange("includeExamples", checked)}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-[var(--text-primary)]">{t("dashboard.reasoning")}</p>
            <p className="text-sm text-[var(--text-secondary)]">{t("dashboard.reasoningBody")}</p>
          </div>
          <Switch
            checked={form.includeChainOfThought}
            onCheckedChange={(checked) => onFieldChange("includeChainOfThought", checked)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => void onGenerate()}
          leadingIcon={<WandSparkles className="size-4" />}
          disabled={loading || form.rawInput.trim().length < 3}
        >
          {loading ? t("common.generating") : t("common.generate")}
        </Button>
        <Button type="button" variant="ghost" onClick={onClear}>
          {t("common.reset")}
        </Button>
      </div>
    </Card>
  );
};
