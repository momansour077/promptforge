import type { Language, PromptFramework, PromptType, TargetAI } from "../types";

const frameworkLabels: Record<PromptFramework, Record<Language, string>> = {
  RTF: { en: "Direct brief", ar: "موجز مباشر" },
  RISEN: { en: "Multi-step brief", ar: "موجز متعدد الخطوات" },
  CARE: { en: "Business brief", ar: "موجز أعمال" },
  TRACE: { en: "Creative brief", ar: "موجز إبداعي" },
  APE: { en: "Quick brief", ar: "موجز سريع" },
  COAST: { en: "Execution plan", ar: "خطة تنفيذ" },
  CHAIN_OF_THOUGHT: { en: "Structured reasoning", ar: "استدلال منظم" },
  FEW_SHOT: { en: "Example-guided", ar: "موجّه بالأمثلة" }
};

const promptTypeLabels: Record<PromptType, Record<Language, string>> = {
  CREATIVE_WRITING: { en: "Creative", ar: "إبداعي" },
  CODE_GENERATION: { en: "Code", ar: "برمجة" },
  DATA_ANALYSIS: { en: "Data analysis", ar: "تحليل بيانات" },
  IMAGE_GENERATION: { en: "Image", ar: "صور" },
  TRANSLATION: { en: "Translation", ar: "ترجمة" },
  SUMMARIZATION: { en: "Summary", ar: "تلخيص" },
  QA: { en: "Q&A", ar: "أسئلة وأجوبة" },
  ROLEPLAY: { en: "Roleplay", ar: "تمثيل أدوار" },
  RESEARCH: { en: "Research", ar: "بحث" },
  BUSINESS: { en: "Business", ar: "أعمال" },
  GENERAL: { en: "General", ar: "عام" }
};

const targetAiLabels: Record<TargetAI, Record<Language, string>> = {
  GENERAL: { en: "General", ar: "عام" },
  CHATGPT: { en: "ChatGPT", ar: "ChatGPT" },
  CLAUDE: { en: "Claude", ar: "Claude" },
  GEMINI: { en: "Gemini", ar: "Gemini" },
  MIDJOURNEY: { en: "Midjourney", ar: "Midjourney" },
  DALL_E: { en: "DALL·E", ar: "DALL·E" },
  STABLE_DIFFUSION: { en: "Stable Diffusion", ar: "Stable Diffusion" },
  COPILOT: { en: "Copilot", ar: "Copilot" }
};

const promptTypeOptionLabels: Record<PromptType, Record<Language, string>> = {
  ...promptTypeLabels,
  GENERAL: { en: "Auto", ar: "تلقائي" }
};

const targetAiOptionLabels: Record<TargetAI, Record<Language, string>> = {
  ...targetAiLabels,
  GENERAL: { en: "Auto", ar: "تلقائي" }
};

const toneLabels: Record<string, Record<Language, string>> = {
  Professional: { en: "Professional", ar: "احترافية" },
  Casual: { en: "Casual", ar: "ودية" },
  Academic: { en: "Academic", ar: "أكاديمية" },
  Creative: { en: "Creative", ar: "إبداعية" },
  Persuasive: { en: "Persuasive", ar: "مقنعة" },
  Technical: { en: "Technical", ar: "تقنية" }
};

export const formatFrameworkLabel = (framework: PromptFramework, language: Language) =>
  frameworkLabels[framework]?.[language] ?? framework;

export const formatPromptTypeLabel = (promptType: PromptType, language: Language) =>
  promptTypeLabels[promptType]?.[language] ?? promptType;

export const formatTargetAiLabel = (targetAI: TargetAI, language: Language) =>
  targetAiLabels[targetAI]?.[language] ?? targetAI;

export const formatPromptTypeOptionLabel = (promptType: PromptType, language: Language) =>
  promptTypeOptionLabels[promptType]?.[language] ?? promptType;

export const formatTargetAiOptionLabel = (targetAI: TargetAI, language: Language) =>
  targetAiOptionLabels[targetAI]?.[language] ?? targetAI;

export const formatToneLabel = (tone: string, language: Language) =>
  toneLabels[tone]?.[language] ?? tone;
