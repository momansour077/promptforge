import type { PromptGenerateInput, PromptType, TargetAI } from "../types";

export const DEFAULT_TARGET_AI: TargetAI = "GENERAL";
export const DEFAULT_PROMPT_TYPE: PromptType = "GENERAL";
export const DEFAULT_TONE = "Professional";

export const PROMPT_TYPE_OPTIONS: readonly PromptType[] = [
  "GENERAL",
  "CREATIVE_WRITING",
  "CODE_GENERATION",
  "DATA_ANALYSIS",
  "IMAGE_GENERATION",
  "TRANSLATION",
  "SUMMARIZATION",
  "QA",
  "ROLEPLAY",
  "RESEARCH",
  "BUSINESS"
] as const;

export const TARGET_AI_OPTIONS: readonly TargetAI[] = [
  "GENERAL",
  "CHATGPT",
  "CLAUDE",
  "GEMINI",
  "MIDJOURNEY",
  "DALL_E",
  "STABLE_DIFFUSION",
  "COPILOT"
] as const;

export const TONE_OPTIONS = [
  "Professional",
  "Casual",
  "Academic",
  "Creative",
  "Persuasive",
  "Technical"
] as const;

export const createInitialPromptForm = (): PromptGenerateInput => ({
  rawInput: "",
  targetAI: DEFAULT_TARGET_AI,
  promptType: DEFAULT_PROMPT_TYPE,
  tone: DEFAULT_TONE,
  includeExamples: false,
  includeChainOfThought: false
});

export const hasPromptFormOverrides = (form: PromptGenerateInput) =>
  form.targetAI !== DEFAULT_TARGET_AI ||
  form.promptType !== DEFAULT_PROMPT_TYPE ||
  form.tone !== DEFAULT_TONE ||
  form.includeExamples ||
  form.includeChainOfThought;
