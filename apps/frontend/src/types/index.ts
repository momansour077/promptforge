export type Language = "en" | "ar";
export type ThemeMode = "dark" | "light";
export type Plan = "FREE" | "PRO" | "ENTERPRISE";
export type PromptType =
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
export type TargetAI =
  | "GENERAL"
  | "CHATGPT"
  | "CLAUDE"
  | "GEMINI"
  | "MIDJOURNEY"
  | "DALL_E"
  | "STABLE_DIFFUSION"
  | "COPILOT";
export type PromptFramework =
  | "RTF"
  | "RISEN"
  | "CARE"
  | "TRACE"
  | "APE"
  | "COAST"
  | "CHAIN_OF_THOUGHT"
  | "FEW_SHOT";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  language: Language;
  plan: Plan;
  promptsToday: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptSectionMap {
  role: string;
  objective: string;
  context: string;
  task: string;
  deliverable: string;
  outputFormat: string;
  toneAndStyle: string;
  decisionRules: string;
  successCriteria: string;
  validationChecklist?: string;
  assumptionPolicy?: string;
  sourcePolicy?: string;
  verificationSteps?: string;
  acceptanceTests?: string;
  constraints: string;
  failureModes: string;
  examples: string;
  executionApproach: string;
}

export interface GeneratedPrompt {
  generatedPrompt: string;
  framework: PromptFramework;
  promptType: PromptType;
  targetAI: TargetAI;
  tone: string;
  domain: string;
  tags: string[];
  wordCount: number;
  estimatedTokens: number;
  rtlRequired: boolean;
  targetAISuggestion: TargetAI;
  improvementTips: string[];
  sections: PromptSectionMap;
  detectedLanguage: Language;
  outputFormat: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  prompts?: PromptRecord[];
  _count?: {
    prompts: number;
  };
}

export interface PromptRecord {
  id: string;
  userId: string;
  rawInput: string;
  detectedLang: Language;
  outputPrompt: string;
  promptType: PromptType;
  targetAI: TargetAI;
  tone: string | null;
  domain: string | null;
  tokensUsed: number;
  isFavorited: boolean;
  isPublic: boolean;
  collectionId: string | null;
  createdAt: string;
  tags: Tag[];
  collection?: Collection | null;
}

export interface AuthPayload {
  user: UserProfile;
}

export interface PromptGeneratePayload {
  prompt: PromptRecord;
  generated: GeneratedPrompt;
}

export interface HistoryPayload {
  items: PromptRecord[];
  total: number;
}

export interface StatsPayload {
  totalPrompts: number;
  favoriteCount: number;
  tokensUsed: number;
  dailyUsage: Array<{ date: string; count: number }>;
}

export interface QuotaPayload {
  quota: {
    limit: number | null;
    used: number;
    remaining: number | null;
    resetAt: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string | string[]>;
}

export interface ApiResponse<TData> {
  success: true;
  data: TData;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: ApiError;
}

export interface PromptGenerateInput {
  rawInput: string;
  targetAI: TargetAI;
  promptType: PromptType;
  tone: string;
  includeExamples: boolean;
  includeChainOfThought: boolean;
}

export interface PromptGenerateRequest {
  rawInput: string;
  targetAI?: TargetAI;
  promptType?: PromptType;
  tone?: string;
  includeExamples?: boolean;
  includeChainOfThought?: boolean;
}
