import { useEffect, useMemo, useState } from "react";

import { Sparkles, Languages, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { promptService } from "../services/promptService";
import type { PromptRecord } from "../types";
import { detectLanguage } from "../utils/langDetect";
import { Header } from "../components/layout/Header";
import { PromptCard } from "../components/prompt/PromptCard";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";

const demoStorageKey = "promptforge-demo-tries";

const buildLocalDemoPrompt = (input: string, language: "en" | "ar"): string =>
  language === "ar"
    ? `[الدور]\nأنت مهندس برومبتات محترف.\n\n[المهمة]\nحوّل الفكرة التالية إلى برومبت احترافي كامل: ${input}\n\n[صيغة الإخراج]\nقدّم الهدف والجمهور والنبرة والخطوات والقيود بشكل منظم.`
    : `[ROLE]\nYou are a professional prompt engineer.\n\n[TASK]\nTransform this idea into a polished prompt: ${input}\n\n[OUTPUT FORMAT]\nReturn a structured prompt with audience, goal, tone, steps, and constraints.`;

export const HomePage = () => {
  const { t } = useTranslation();
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [demoInput, setDemoInput] = useState("");
  const [demoOutput, setDemoOutput] = useState("");
  const [publicPrompts, setPublicPrompts] = useState<PromptRecord[]>([]);
  const [triesRemaining, setTriesRemaining] = useState<number>(() => {
    const stored = window.localStorage.getItem(demoStorageKey);
    return stored ? Number.parseInt(stored, 10) : 3;
  });

  const taglines = useMemo(
    () => [
      "Sharper prompts for serious work.",
      "حوّل الفكرة الخام إلى برومبت جاهز للتنفيذ.",
      "Prompt engineering, bilingual by design."
    ],
    []
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTaglineIndex((current) => (current + 1) % taglines.length);
    }, 2600);

    return () => {
      window.clearInterval(interval);
    };
  }, [taglines.length]);

  useEffect(() => {
    const loadPublicPrompts = async () => {
      try {
        const prompts = await promptService.listPublic();
        setPublicPrompts(prompts.slice(0, 3));
      } catch {
        setPublicPrompts([]);
      }
    };

    void loadPublicPrompts();
  }, []);

  return (
    <div className="app-shell mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="liquid-orb one" />
      <div className="liquid-orb two" />
      <Header />

      <section className="grid gap-6 py-10 lg:grid-cols-[1.08fr_0.92fr]">
        <Card className="space-y-6 p-8 sm:p-10">
          <p className="eyebrow">{t("hero.kicker")}</p>
          <h1 className="hero-title font-heading text-6xl leading-[0.92] sm:text-7xl">{t("hero.title")}</h1>
          <p className="max-w-xl text-lg text-[var(--text-secondary)]">{t("hero.subtitle")}</p>
          <div className="rounded-[28px] border border-[rgba(183,208,255,0.14)] bg-[linear-gradient(180deg,rgba(8,12,20,0.78),rgba(11,16,26,0.56))] px-5 py-7">
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Live cadence</p>
            <p className="font-mono text-sm text-[#c7ddff]">{taglines[taglineIndex]}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/auth">{t("nav.register")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/dashboard">{t("nav.dashboard")}</Link>
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-6 sm:p-7">
          <p className="eyebrow">
            {t("hero.demoLabel")}
          </p>
          <Textarea
            value={demoInput}
            placeholder={t("hero.demoPlaceholder")}
            onChange={(event) => setDemoInput(event.target.value)}
          />
          <p className="text-sm text-[var(--text-secondary)]">
            {triesRemaining > 0 ? t("hero.demoLimit", { count: triesRemaining }) : t("hero.demoLocked")}
          </p>
          <Button
            type="button"
            disabled={triesRemaining < 1 || demoInput.trim().length < 3}
            onClick={() => {
              const nextTries = Math.max(triesRemaining - 1, 0);
              const language = detectLanguage(demoInput);
              setDemoOutput(buildLocalDemoPrompt(demoInput, language));
              setTriesRemaining(nextTries);
              window.localStorage.setItem(demoStorageKey, String(nextTries));
            }}
          >
            {t("common.generate")}
          </Button>
          {demoOutput ? (
            <div className="rounded-[26px] border border-[rgba(183,208,255,0.12)] bg-[linear-gradient(180deg,rgba(8,12,20,0.8),rgba(11,16,26,0.6))] p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm text-warm">{demoOutput}</pre>
            </div>
          ) : null}
        </Card>
      </section>

      <section className="grid gap-4 py-6 md:grid-cols-3">
        {[
          { icon: Sparkles, title: t("hero.featureOneTitle"), body: t("hero.featureOneBody") },
          { icon: Languages, title: t("hero.featureTwoTitle"), body: t("hero.featureTwoBody") },
          { icon: Workflow, title: t("hero.featureThreeTitle"), body: t("hero.featureThreeBody") }
        ].map((feature) => (
          <Card key={feature.title} className="space-y-3 p-6">
            <div className="inline-flex w-fit rounded-2xl border border-[rgba(183,208,255,0.12)] bg-[rgba(103,163,255,0.08)] p-3">
              <feature.icon className="size-5 text-[#c7ddff]" />
            </div>
            <h2 className="text-2xl font-semibold">{feature.title}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{feature.body}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 py-6 md:grid-cols-3">
        {[
          { title: t("pricing.free"), body: t("pricing.freeDesc") },
          { title: t("pricing.pro"), body: t("pricing.proDesc") },
          { title: t("pricing.enterprise"), body: t("pricing.enterpriseDesc") }
        ].map((plan) => (
          <Card key={plan.title} className="space-y-3 p-6">
            <h3 className="font-heading text-4xl">{plan.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{plan.body}</p>
          </Card>
        ))}
      </section>

      <section className="py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-5xl">Community prompts</h2>
          <Button asChild variant="secondary">
            <Link to="/auth">{t("nav.signIn")}</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {publicPrompts.length > 0 ? (
            publicPrompts.map((prompt) => <PromptCard key={prompt.id} prompt={prompt} />)
          ) : (
            <Card className="md:col-span-3">{t("empty.publicPrompts")}</Card>
          )}
        </div>
      </section>
    </div>
  );
};
