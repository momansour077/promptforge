import { useEffect } from "react";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { PromptInput } from "../components/prompt/PromptInput";
import { PromptOutput } from "../components/prompt/PromptOutput";
import { usePromptGeneration } from "../hooks/usePromptGeneration";

export const DashboardPage = () => {
  const { t } = useTranslation();
  const {
    form,
    result,
    promptId,
    loading,
    copied,
    detectedLanguage,
    setField,
    clearInput,
    generate,
    regenerate,
    copyOutput
  } = usePromptGeneration();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && result) {
        event.preventDefault();
        void copyOutput();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copyOutput, result]);

  return (
    <section className="space-y-6">
      <div>
        <p className="eyebrow">Workspace</p>
        <h1 className="mt-2 font-heading text-6xl">{t("dashboard.title")}</h1>
        <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">{t("dashboard.subtitle")}</p>
      </div>

      <div className="prompt-grid">
        <PromptInput
          form={form}
          detectedLanguage={detectedLanguage}
          loading={loading}
          onFieldChange={setField}
          onGenerate={() => void generate()}
          onClear={() => {
            clearInput();
            toast.success("Draft cleared.");
          }}
        />
        <PromptOutput
          result={result}
          promptId={promptId}
          copied={copied}
          onCopy={() => void copyOutput()}
          onRegenerate={() => void regenerate()}
        />
      </div>
    </section>
  );
};
