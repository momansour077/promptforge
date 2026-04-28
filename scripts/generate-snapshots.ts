#!/usr/bin/env ts-node

import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type SupportedLanguage = "en" | "ar";
export type PromptTypeValue =
  | "CREATIVE_WRITING"
  | "CODE_GENERATION"
  | "DATA_ANALYSIS"
  | "IMAGE_GENERATION"
  | "TRANSLATION"
  | "SUMMARIZATION"
  | "QA"
  | "ROLEPLAY"
  | "RESEARCH"
  | "BUSINESS"
  | "GENERAL";
export type TargetAIValue =
  | "GENERAL"
  | "CHATGPT"
  | "CLAUDE"
  | "GEMINI"
  | "MIDJOURNEY"
  | "STABLE_DIFFUSION"
  | "DALL_E"
  | "COPILOT";

interface BuildInput {
  rawInput: string;
  preferredLanguage?: SupportedLanguage;
  promptType?: PromptTypeValue;
  tone?: string;
  targetAI?: TargetAIValue;
  includeExamples?: boolean;
  includeChainOfThought?: boolean;
}

interface BuiltPrompt {
  generatedPrompt: string;
  detectedLanguage: SupportedLanguage;
  promptType: PromptTypeValue;
  framework: string;
  rtlRequired: boolean;
}

export interface PromptRegressionSeed {
  id: string;
  rawInput: string;
  taskType: PromptTypeValue;
  targetModel: TargetAIValue;
  language: SupportedLanguage;
  buildInput?: Omit<BuildInput, "rawInput">;
}

export interface PromptStructuralScoreVector {
  rolePresent: number;
  objectivePresent: number;
  outputFormatPresent: number;
  decisionRulesPresent: number;
  wordCount: number;
  sectionCount: number;
}

export interface PromptSnapshotRecord {
  id: string;
  inputSeed: string;
  taskType: PromptTypeValue;
  targetModel: TargetAIValue;
  language: SupportedLanguage;
  detectedLanguage: SupportedLanguage;
  promptType: PromptTypeValue;
  framework: string;
  generatedPrompt: string;
  structuralScore: PromptStructuralScoreVector;
  metadata: {
    rtlRequired: boolean;
    characterCount: number;
    arabicCharacterCount: number;
  };
}

export interface PromptSnapshotBaseline {
  generatedAt: string;
  version: 1;
  seedCount: number;
  records: PromptSnapshotRecord[];
}

const currentFilePath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(currentFilePath);
const repoRoot = dirname(scriptsDir);
const baselinePath = join(repoRoot, "test", "snapshots", "prompt-baseline.json");
const backendRoot = join(repoRoot, "apps", "backend");
const promptBuilderRuntimePath = join(
  backendRoot,
  "dist",
  "src",
  "services",
  "promptBuilder.js"
);

const structuralMarkers = {
  role: ["[role]", "[الدور]"],
  objective: ["[objective]", "[الهدف]"],
  outputFormat: ["[output format]", "[صيغة الإخراج]"],
  decisionRules: ["[decision rules]", "[قواعد اتخاذ القرار]"]
} as const;

const arabicCharacterPattern = /[\u0600-\u06FF]/gu;
const sectionHeadingPattern = /^\[[^\n]+\]$/gmu;
let promptBuilderPromise: Promise<{ build: (input: BuildInput) => BuiltPrompt }> | null = null;

export const PROMPT_REGRESSION_SEEDS: PromptRegressionSeed[] = [
  {
    id: "en_product_words_app",
    rawInput: "kids word app",
    taskType: "CODE_GENERATION",
    targetModel: "GENERAL",
    language: "en"
  },
  {
    id: "en_code_react_accessibility",
    rawInput: "React accessibility",
    taskType: "CODE_GENERATION",
    targetModel: "COPILOT",
    language: "en",
    buildInput: {
      targetAI: "COPILOT"
    }
  },
  {
    id: "en_research_b2b_pricing",
    rawInput: "research the best pricing model for a B2B SaaS analytics product",
    taskType: "RESEARCH",
    targetModel: "GENERAL",
    language: "en"
  },
  {
    id: "en_image_robotics_poster",
    rawInput: "robotics poster",
    taskType: "IMAGE_GENERATION",
    targetModel: "MIDJOURNEY",
    language: "en",
    buildInput: {
      targetAI: "MIDJOURNEY"
    }
  },
  {
    id: "en_business_saas_pricing",
    rawInput: "SaaS pricing",
    taskType: "BUSINESS",
    targetModel: "GENERAL",
    language: "en"
  },
  {
    id: "en_creative_coffee_launch",
    rawInput: "write a founder launch story for a specialty coffee brand",
    taskType: "CREATIVE_WRITING",
    targetModel: "CHATGPT",
    language: "en",
    buildInput: {
      targetAI: "CHATGPT"
    }
  },
  {
    id: "ar_product_words_app",
    rawInput: "تطبيق كلمات للأطفال",
    taskType: "CODE_GENERATION",
    targetModel: "GENERAL",
    language: "ar"
  },
  {
    id: "ar_code_react_accessibility",
    rawInput: "إتاحة React",
    taskType: "CODE_GENERATION",
    targetModel: "COPILOT",
    language: "ar",
    buildInput: {
      targetAI: "COPILOT"
    }
  },
  {
    id: "ar_research_b2b_pricing",
    rawInput: "ابحث أفضل نموذج تسعير لمنتج تحليلات SaaS موجه للشركات",
    taskType: "RESEARCH",
    targetModel: "GENERAL",
    language: "ar"
  },
  {
    id: "ar_image_robotics_poster",
    rawInput: "بوستر روبوتات",
    taskType: "IMAGE_GENERATION",
    targetModel: "MIDJOURNEY",
    language: "ar",
    buildInput: {
      targetAI: "MIDJOURNEY"
    }
  },
  {
    id: "ar_business_saas_pricing",
    rawInput: "تسعير SaaS",
    taskType: "BUSINESS",
    targetModel: "GENERAL",
    language: "ar"
  },
  {
    id: "ar_creative_coffee_launch",
    rawInput: "اكتب قصة إطلاق لعلامة قهوة تستهدف مؤسسي الشركات الناشئة",
    taskType: "CREATIVE_WRITING",
    targetModel: "CHATGPT",
    language: "ar",
    buildInput: {
      targetAI: "CHATGPT"
    }
  }
];

const countWords = (value: string): number =>
  value.trim().split(/\s+/u).filter(Boolean).length;

const countCharacters = (value: string): number => value.trim().length;

const countArabicCharacters = (value: string): number =>
  (value.match(arabicCharacterPattern) ?? []).length;

const hasAnyMarker = (value: string, markers: readonly string[]): boolean => {
  const lowered = value.toLowerCase();
  return markers.some((marker) => lowered.includes(marker));
};

const countStructuredSections = (value: string): number =>
  new Set(Array.from(value.matchAll(sectionHeadingPattern), (match) => match[0])).size;

export const scorePromptStructure = (prompt: string): PromptStructuralScoreVector => ({
  rolePresent: hasAnyMarker(prompt, structuralMarkers.role) ? 100 : 0,
  objectivePresent: hasAnyMarker(prompt, structuralMarkers.objective) ? 100 : 0,
  outputFormatPresent: hasAnyMarker(prompt, structuralMarkers.outputFormat) ? 100 : 0,
  decisionRulesPresent: hasAnyMarker(prompt, structuralMarkers.decisionRules) ? 100 : 0,
  wordCount: countWords(prompt),
  sectionCount: countStructuredSections(prompt)
});

export const buildSnapshotRecord = (
  seed: PromptRegressionSeed,
  builtPrompt: BuiltPrompt
): PromptSnapshotRecord => ({
  id: seed.id,
  inputSeed: seed.rawInput,
  taskType: seed.taskType,
  targetModel: seed.targetModel,
  language: seed.language,
  detectedLanguage: builtPrompt.detectedLanguage,
  promptType: builtPrompt.promptType,
  framework: builtPrompt.framework,
  generatedPrompt: builtPrompt.generatedPrompt,
  structuralScore: scorePromptStructure(builtPrompt.generatedPrompt),
  metadata: {
    rtlRequired: builtPrompt.rtlRequired,
    characterCount: countCharacters(builtPrompt.generatedPrompt),
    arabicCharacterCount: countArabicCharacters(builtPrompt.generatedPrompt)
  }
});

const ensureBackendBuild = (): void => {
  execFileSync("npm", ["run", "build"], {
    cwd: backendRoot,
    stdio: "inherit"
  });
};

export const loadPromptBuilder = async (): Promise<{
  build: (input: BuildInput) => BuiltPrompt;
}> => {
  if (!promptBuilderPromise) {
    promptBuilderPromise = (async () => {
      ensureBackendBuild();
      const modulePath = pathToFileURL(promptBuilderRuntimePath).href;
      const resolvedModule = (await import(modulePath)) as {
        promptBuilder: { build: (input: BuildInput) => BuiltPrompt };
      };

      return resolvedModule.promptBuilder;
    })();
  }

  return promptBuilderPromise;
};

export const generateRecordForSeed = async (
  seed: PromptRegressionSeed
): Promise<PromptSnapshotRecord> => {
  const builder = await loadPromptBuilder();
  const builtPrompt = builder.build({
    rawInput: seed.rawInput,
    ...seed.buildInput
  });

  return buildSnapshotRecord(seed, builtPrompt);
};

export const generateSnapshotBaseline = async (): Promise<PromptSnapshotBaseline> => {
  const records: PromptSnapshotRecord[] = [];

  for (const seed of PROMPT_REGRESSION_SEEDS) {
    records.push(await generateRecordForSeed(seed));
  }

  return {
    generatedAt: new Date().toISOString(),
    version: 1,
    seedCount: records.length,
    records
  };
};

export const writeSnapshotBaseline = (baseline: PromptSnapshotBaseline): string => {
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  return baselinePath;
};

const main = async (): Promise<void> => {
  const baseline = await generateSnapshotBaseline();
  const outputPath = writeSnapshotBaseline(baseline);

  console.log(
    JSON.stringify(
      {
        outputPath,
        seedCount: baseline.seedCount,
        ids: baseline.records.map((record) => record.id)
      },
      null,
      2
    )
  );
};

if (process.argv[1] && resolve(process.argv[1]) === currentFilePath) {
  void main();
}
