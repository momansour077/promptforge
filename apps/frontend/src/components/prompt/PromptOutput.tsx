import { useEffect, useState } from "react";

import { Check, Clipboard, FolderPlus, RefreshCcw, Save, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { collectionService } from "../../services/collectionService";
import { promptService } from "../../services/promptService";
import type { Collection, GeneratedPrompt } from "../../types";
import { formatFrameworkLabel, formatPromptTypeLabel } from "../../utils/promptLabels";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "../ui/dialog";

interface PromptOutputProps {
  result: GeneratedPrompt | null;
  promptId: string | null;
  copied: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
}

const sectionColors = [
  "border-indigo-400/30 bg-indigo-500/10",
  "border-emerald-400/30 bg-emerald-500/10",
  "border-amber-400/30 bg-amber-500/10",
  "border-pink-400/30 bg-pink-500/10"
];

const sectionLabels = {
  en: {
    role: "Role",
    objective: "Objective",
    context: "Context",
    task: "Task",
    deliverable: "Deliverable",
    outputFormat: "Output Format",
    toneAndStyle: "Tone & Style",
    decisionRules: "Decision Rules",
    responseBudget: "Response Budget",
    successCriteria: "Success Criteria",
    validationChecklist: "Validation Checklist",
    assumptionPolicy: "Assumption Policy",
    sourcePolicy: "Source Policy",
    verificationSteps: "Verification Steps",
    acceptanceTests: "Acceptance Tests",
    constraints: "Constraints",
    failureModes: "Failure Modes To Avoid",
    examples: "Examples",
    executionApproach: "Execution Approach"
  },
  ar: {
    role: "الدور",
    objective: "الهدف",
    context: "السياق",
    task: "المهمة",
    deliverable: "المخرج المطلوب",
    outputFormat: "صيغة الإخراج",
    toneAndStyle: "النبرة والأسلوب",
    decisionRules: "قواعد اتخاذ القرار",
    responseBudget: "ميزانية الاستجابة",
    successCriteria: "معايير النجاح",
    validationChecklist: "قائمة التحقق",
    assumptionPolicy: "سياسة الافتراضات",
    sourcePolicy: "سياسة المصادر",
    verificationSteps: "خطوات التحقق",
    acceptanceTests: "معايير القبول",
    constraints: "القيود",
    failureModes: "ما يجب تجنبه",
    examples: "أمثلة",
    executionApproach: "منهج التنفيذ"
  }
} as const;

export const PromptOutput = ({
  result,
  promptId,
  copied,
  onCopy,
  onRegenerate
}: PromptOutputProps) => {
  const { t } = useTranslation();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sectionLocale = result?.detectedLanguage === "ar" ? "ar" : "en";

  useEffect(() => {
    const loadCollections = async () => {
      try {
        const items = await collectionService.list();
        setCollections(items);
      } catch {
        setCollections([]);
      }
    };

    void loadCollections();
  }, []);

  if (!result) {
    return (
      <Card className="flex min-h-[560px] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full border border-white/10 bg-white/5 p-5">
          <RefreshCcw className="size-8 text-accent" />
        </div>
        <h3 className="font-heading text-4xl">{t("dashboard.outputEmptyTitle")}</h3>
        <p className="max-w-md text-sm text-[var(--text-secondary)]">{t("dashboard.outputEmptyBody")}</p>
      </Card>
    );
  }

  return (
      <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">
            Prompt Output
          </p>
          <h2 className="mt-2 font-heading text-4xl">Structured Prompt</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{formatFrameworkLabel(result.framework, sectionLocale)}</Badge>
          <Badge>{formatPromptTypeLabel(result.promptType, sectionLocale)}</Badge>
          <Badge>{result.detectedLanguage.toUpperCase()}</Badge>
          <Badge>{result.estimatedTokens} tokens</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void onCopy()} leadingIcon={copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}>
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => promptService.downloadPrompt(result)} leadingIcon={<Save className="size-4" />}>
          {t("common.save")}
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="secondary" leadingIcon={<FolderPlus className="size-4" />}>
              {t("dashboard.addToCollection")}
            </Button>
          </DialogTrigger>
          <DialogContent
            title={t("dashboard.addToCollection")}
            description="Select a destination collection for this saved prompt."
          >
            <div className="space-y-3">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[var(--bg-muted)] px-4 py-3 text-left transition hover:border-accent"
                  onClick={async () => {
                    if (!promptId) {
                      return;
                    }

                    await collectionService.addPrompt(collection.id, promptId);
                    toast.success(t("toast.promptAdded"));
                    setDialogOpen(false);
                  }}
                >
                  <div>
                    <p className="font-medium">{collection.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{collection.description}</p>
                  </div>
                  <Badge>{collection._count?.prompts ?? 0}</Badge>
                </button>
              ))}
              {collections.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Create a collection first from the Collections page.</p>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
        <Button type="button" variant="secondary" onClick={() => void onRegenerate()} leadingIcon={<RefreshCcw className="size-4" />}>
          {t("dashboard.regenerate")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(result.generatedPrompt);
            toast.success(t("dashboard.shareReady"));
          }}
          leadingIcon={<Share2 className="size-4" />}
        >
          {t("common.share")}
        </Button>
      </div>

      <div
        dir={result.rtlRequired ? "rtl" : "ltr"}
        className="grid gap-3 rounded-[28px] border border-[rgba(183,208,255,0.12)] bg-[rgba(8,12,20,0.38)] p-4"
      >
        {Object.entries(result.sections)
          .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
          .map(([key, value], index) => (
          <div
            key={key}
            className={`rounded-[22px] border p-4 ${sectionColors[index % sectionColors.length]}`}
          >
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {sectionLabels[sectionLocale][key as keyof typeof sectionLabels.en] ?? key}
            </p>
            <p className="whitespace-pre-wrap leading-7 text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[26px] border border-[rgba(183,208,255,0.12)] bg-[linear-gradient(180deg,rgba(6,10,19,0.92),rgba(8,12,20,0.72))] p-4 text-warm" dir={result.rtlRequired ? "rtl" : "ltr"}>
        <pre className="whitespace-pre-wrap font-mono text-sm leading-7 text-warm">{result.generatedPrompt}</pre>
      </div>

      <details className="rounded-[22px] border border-[rgba(183,208,255,0.12)] bg-[rgba(8,12,20,0.42)] p-4">
        <summary className="cursor-pointer font-medium text-[var(--text-primary)]">
          {t("dashboard.improvementTips")}
        </summary>
        <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
          {result.improvementTips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      </details>
    </Card>
  );
};
