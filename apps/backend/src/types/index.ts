import type { Request } from "express";

export type SupportedLanguage = "en" | "ar";
export type UserPlan = "FREE" | "PRO" | "ENTERPRISE";
export type PromptFramework =
  | "RTF"
  | "RISEN"
  | "CARE"
  | "TRACE"
  | "APE"
  | "COAST"
  | "CHAIN_OF_THOUGHT"
  | "FEW_SHOT";
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

export interface AuthenticatedUser {
  userId: string;
  email: string;
  plan: UserPlan;
  language: SupportedLanguage;
}

export interface PromptSections {
  role: string;
  objective: string;
  context: string;
  task: string;
  deliverable: string;
  outputFormat: string;
  toneAndStyle: string;
  decisionRules: string;
  responseBudget?: string;
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

export interface PromptAnalysis {
  detectedLanguage: SupportedLanguage;
  promptType: PromptTypeValue;
  framework: PromptFramework;
  tone: string;
  domain: string;
  outputFormat: string;
  targetAI: TargetAIValue;
  tags: string[];
  rtlRequired: boolean;
}

export interface BuildInput {
  rawInput: string;
  preferredLanguage?: SupportedLanguage;
  promptType?: PromptTypeValue;
  tone?: string;
  targetAI?: TargetAIValue;
  includeExamples?: boolean;
  includeChainOfThought?: boolean;
}

export interface BuiltPrompt extends PromptAnalysis {
  generatedPrompt: string;
  wordCount: number;
  estimatedTokens: number;
  targetAISuggestion: TargetAIValue;
  improvementTips: string[];
  sections: PromptSections;
}

export interface AIResponsePayload {
  generatedPrompt: string;
  wordCount: number;
  estimatedTokens: number;
  source?: string;
  cacheStatus?: string;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, string | string[]>;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PromptHistoryQuery extends PaginationQuery {
  promptType?: PromptTypeValue;
  language?: SupportedLanguage;
  startDate?: string;
  endDate?: string;
  favorited?: string;
  sortBy?: "newest" | "oldest" | "most_tokens";
}

export interface QuotaState {
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAt: number;
}

export interface GeneratePromptBody {
  rawInput: string;
  promptType?: PromptTypeValue;
  tone?: string;
  targetAI?: TargetAIValue;
  includeExamples?: boolean;
  includeChainOfThought?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RequestWithBody<TBody> extends Request<Record<string, string>, unknown, TBody> {}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
      csrfTokenValue?: string;
    }
  }
}
