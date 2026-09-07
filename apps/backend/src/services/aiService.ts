import { createHash } from "node:crypto";

import OpenAI from "openai";
import { z } from "zod";

import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import type { AIResponsePayload, BuildInput, BuiltPrompt } from "../types/index.js";

import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

import { countWords, estimateTokens } from "./tokenCounter.js";

const aiResponseSchema = z.object({
  generatedPrompt: z.string().min(1)
});

type ParsedAIResponse = z.infer<typeof aiResponseSchema>;

const cachedAiResponseSchema = z.object({
  generatedPrompt: z.string().min(1),
  wordCount: z.number().nonnegative(),
  estimatedTokens: z.number().nonnegative()
});

const aiResponseFormat = {
  type: "json_schema" as const,
  json_schema: {
    name: "promptforge_result",
    schema: {
      type: "object",
      properties: {
        generatedPrompt: { type: "string" }
      },
      required: ["generatedPrompt"],
      additionalProperties: false
    }
  }
};

interface AIErrorDetails {
  classification: "rate_limit" | "auth" | "model" | "network" | "unknown";
  retryable: boolean;
}

interface StatusError {
  status?: number;
  message?: string;
}

interface CompletionResult {
  generatedPrompt: string;
  promptTokens: number;
  completionTokens: number;
}

type PromptSource =
  | "builder"
  | "mistral"
  | "mistral_repaired"
  | "cache_memory"
  | "cache_redis";

type PromptCacheStatus = "skip" | "miss" | "memory" | "redis";

interface PromptQualityIssue {
  code: string;
  message: string;
}

const PROMPT_CACHE_TTL_SECONDS = 60 * 60 * 24;
const PROMPT_CACHE_VERSION = "v4";
const META_LEAK_PATTERNS = [
  /apply the framework precisely/iu,
  /transform the idea into (a )?prompt/iu,
  /use the (role|task|format|trace|coast|risen|care|ape)/iu,
  /طبّق إطار/iu,
  /حوّل الفكرة/iu
];
const ENGLISH_VALIDATION_TOKENS = ["validation checklist", "before returning", "confirm"];
const ARABIC_VALIDATION_TOKENS = ["قائمة التحقق", "قبل الرد", "تأكد"];
const ENGLISH_SOURCE_POLICY_TOKENS = ["source policy", "evidence", "uncertainty"];
const ARABIC_SOURCE_POLICY_TOKENS = ["سياسة المصادر", "الأدلة", "عدم اليقين"];
const ENGLISH_VERIFICATION_TOKENS = ["verification steps", "verify", "tests", "acceptance tests"];
const ARABIC_VERIFICATION_TOKENS = ["خطوات التحقق", "تحقق", "اختبارات", "معايير القبول"];
const ENGLISH_RESPONSE_BUDGET_TOKENS = ["response budget", "complete response", "concise"];
const ARABIC_RESPONSE_BUDGET_TOKENS = ["ميزانية الاستجابة", "استجابة واحدة", "موجزة"];

interface InMemoryCacheEntry extends AIResponsePayload {
  expiresAt: number;
}

interface CacheLookupResult {
  payload: AIResponsePayload | null;
  cacheStatus: Extract<PromptCacheStatus, "memory" | "redis" | "miss">;
}

declare global {

  var __promptforgePromptCache__: Map<string, InMemoryCacheEntry> | undefined;
}

const inMemoryPromptCache =
  globalThis.__promptforgePromptCache__ ?? new Map<string, InMemoryCacheEntry>();

if (process.env.NODE_ENV !== "production") {
  globalThis.__promptforgePromptCache__ = inMemoryPromptCache;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStatusError = (value: unknown): value is StatusError =>
  isObject(value) &&
  (typeof value.status === "number" ||
    typeof value.message === "string");

const sleep = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export class AIService {
  private readonly client: OpenAI;

  public constructor(client?: OpenAI) {
    this.client =
      client ??
      new OpenAI({
        apiKey: env.MISTRAL_API_KEY,
        baseURL: env.MISTRAL_BASE_URL
      });
  }

  public async generatePrompt(
    rawInput: string,
    builtPrompt: BuiltPrompt
  ): Promise<AIResponsePayload> {
    if (this.shouldBypassEnhancement(rawInput, builtPrompt)) {
      return {
        generatedPrompt: builtPrompt.generatedPrompt,
        wordCount: builtPrompt.wordCount,
        estimatedTokens: builtPrompt.estimatedTokens,
        source: "builder",
        cacheStatus: "skip"
      };
    }

    const requestPayload = JSON.stringify(this.buildRequestPayload(rawInput, builtPrompt));
    const maxTokens = this.getMaxTokens(rawInput, builtPrompt);
    const cacheKey = this.buildCacheKey(rawInput, builtPrompt);
    const { payload: cached } = await this.getCachedResponse(cacheKey);

    if (cached) {
      logger.debug(
        {
          model: env.MISTRAL_MODEL,
          cacheKey
        },
        "Prompt generation cache hit"
      );

      return cached;
    }

    const initialResult = await this.generateCompletion({
      systemPrompt: this.getSystemPrompt(),
      userContent: requestPayload,
      maxTokens
    });

    let finalPrompt = initialResult.generatedPrompt;
    let totalPromptTokens = initialResult.promptTokens;
    let totalCompletionTokens = initialResult.completionTokens;
    let source: PromptSource = "mistral";

    const qualityIssues = this.collectQualityIssues(initialResult.generatedPrompt, builtPrompt);

    if (qualityIssues.length > 0) {
      logger.warn(
        {
          model: env.MISTRAL_MODEL,
          qualityIssues
        },
        "Primary Mistral output failed quality gate, attempting repair"
      );

      try {
        const repaired = await this.repairPrompt(
          rawInput,
          builtPrompt,
          initialResult.generatedPrompt,
          qualityIssues
        );

        const repairedIssues = this.collectQualityIssues(repaired.generatedPrompt, builtPrompt);

        totalPromptTokens += repaired.promptTokens;
        totalCompletionTokens += repaired.completionTokens;

        if (repairedIssues.length === 0) {
          finalPrompt = repaired.generatedPrompt;
          source = "mistral_repaired";
        } else {
          logger.warn(
            {
              repairedIssues,
              model: env.MISTRAL_MODEL
            },
            "Repaired prompt still failed quality gate, using deterministic builder draft"
          );
          finalPrompt = builtPrompt.generatedPrompt;
        }
      } catch (error) {
        logger.warn(
          {
            error,
            model: env.MISTRAL_MODEL
          },
          "Prompt repair failed, using deterministic builder draft"
        );
        finalPrompt = builtPrompt.generatedPrompt;
      }
    }

    const payload: AIResponsePayload = {
      generatedPrompt: finalPrompt,
      wordCount: countWords(finalPrompt),
      estimatedTokens: totalPromptTokens + totalCompletionTokens,
      source,
      cacheStatus: "miss"
    };

    await this.setCachedResponse(cacheKey, payload);

    return payload;
  }

  public async *streamPrompt(
    rawInput: string,
    buildInput: BuildInput
  ): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: env.MISTRAL_MODEL,
      max_tokens: 1600,
      temperature: 0.2,
      stream: true,
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt()
        },
        {
          role: "user",
          content: JSON.stringify({
            rawInput,
            buildInput
          })
        }
      ]
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;

      if (typeof delta === "string" && delta.length > 0) {
        yield delta;
      }
    }
  }

  public classifyError(error: unknown): AIErrorDetails {
    if (isStatusError(error) && typeof error.status === "number") {
      if (error.status === 401 || error.status === 403) {
        return {
          classification: "auth",
          retryable: false
        };
      }

      if (error.status === 429) {
        return {
          classification: "rate_limit",
          retryable: true
        };
      }

      if (error.status >= 500) {
        return {
          classification: "model",
          retryable: true
        };
      }
    }

    if (error instanceof Error && /network|timeout|socket|fetch/iu.test(error.message)) {
      return {
        classification: "network",
        retryable: true
      };
    }

    return {
      classification: "unknown",
      retryable: false
    };
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const details = this.classifyError(error);

        logger.warn(
          {
            attempt,
            details,
            error,
            model: env.MISTRAL_MODEL
          },
          "Mistral request failed"
        );

        if (!details.retryable || attempt === 3) {
          break;
        }

        await sleep(200 * 2 ** (attempt - 1));
      }
    }

    throw new AppError(
      502,
      "AI_PROVIDER_ERROR",
      "Prompt generation failed with the configured AI provider.",
      {
        provider: "mistral",
        model: env.MISTRAL_MODEL,
        reason: lastError instanceof Error ? lastError.message : "unknown"
      }
    );
  }

  private async generateCompletion(input: {
    systemPrompt: string;
    userContent: string;
    maxTokens: number;
  }): Promise<CompletionResult> {
    const estimatedInputTokens =
      estimateTokens(input.systemPrompt) + estimateTokens(input.userContent);
    const response = await this.withRetry(async () =>
      this.client.chat.completions.create({
        model: env.MISTRAL_MODEL,
        max_tokens: input.maxTokens,
        temperature: 0.15,
        response_format: aiResponseFormat,
        messages: [
          {
            role: "system",
            content: input.systemPrompt
          },
          {
            role: "user",
            content: input.userContent
          }
        ]
      })
    );

    const text = response.choices[0]?.message.content;

    if (typeof text !== "string" || !text.trim()) {
      throw new AppError(502, "AI_RESPONSE_INVALID", "AI provider returned empty content.");
    }

    const parsed = this.parseJsonPayload(text);
    const promptTokens = response.usage?.prompt_tokens ?? estimatedInputTokens;
    const completionTokens =
      response.usage?.completion_tokens ?? estimateTokens(parsed.generatedPrompt);

    logger.debug(
      {
        model: env.MISTRAL_MODEL,
        maxTokens: input.maxTokens,
        promptTokens,
        completionTokens
      },
      "Mistral generation completed"
    );

    return {
      generatedPrompt: parsed.generatedPrompt,
      promptTokens,
      completionTokens
    };
  }

  private buildRequestPayload(
    rawInput: string,
    builtPrompt: BuiltPrompt
  ): {
    rawInput: string;
    analysis: {
      language: BuiltPrompt["detectedLanguage"];
      promptType: BuiltPrompt["promptType"];
      targetAI: BuiltPrompt["targetAI"];
      tone: BuiltPrompt["tone"];
      domain: BuiltPrompt["domain"];
      rtlRequired: BuiltPrompt["rtlRequired"];
    };
    promptDraft: string;
  } {
    return {
      rawInput,
      analysis: {
        language: builtPrompt.detectedLanguage,
        promptType: builtPrompt.promptType,
        targetAI: builtPrompt.targetAI,
        tone: builtPrompt.tone,
        domain: builtPrompt.domain,
        rtlRequired: builtPrompt.rtlRequired
      },
      promptDraft: builtPrompt.generatedPrompt
    };
  }

  private getMaxTokens(rawInput: string, builtPrompt: BuiltPrompt): number {
    const isBroadBuildPrompt =
      builtPrompt.generatedPrompt.includes("Product Goal") ||
      builtPrompt.generatedPrompt.includes("الهدف من المنتج");
    const baselineTokens = builtPrompt.estimatedTokens;

    if (isBroadBuildPrompt) {
      return Math.min(1000, Math.max(700, baselineTokens + 140));
    }

    switch (builtPrompt.promptType) {
      case "IMAGE_GENERATION":
        return Math.min(560, Math.max(360, baselineTokens + 80));
      case "TRANSLATION":
      case "SUMMARIZATION":
      case "QA":
        return Math.min(700, Math.max(420, baselineTokens + 100));
      case "DATA_ANALYSIS":
      case "RESEARCH":
      case "BUSINESS":
      case "CREATIVE_WRITING":
        return Math.min(820, Math.max(520, baselineTokens + 120));
      case "CODE_GENERATION":
      case "GENERAL":
      case "ROLEPLAY":
      default:
        return Math.min(900, Math.max(560, baselineTokens + 130));
    }
  }

  private collectQualityIssues(
    generatedPrompt: string,
    builtPrompt: BuiltPrompt
  ): PromptQualityIssue[] {
    const issues: PromptQualityIssue[] = [];
    const expectedMarkers = this.extractStructureMarkers(builtPrompt.generatedPrompt);
    const missingMarkers = expectedMarkers.filter((marker) => !generatedPrompt.includes(marker));

    if (missingMarkers.length > 0) {
      issues.push({
        code: "missing_markers",
        message: `Missing required structure markers: ${missingMarkers.join(", ")}`
      });
    }

    const firstMarker = expectedMarkers[0];

    if (firstMarker && !generatedPrompt.trimStart().startsWith(firstMarker)) {
      issues.push({
        code: "incorrect_start",
        message: `Prompt should begin with ${firstMarker}`
      });
    }

    const metaLeak = META_LEAK_PATTERNS.find((pattern) => pattern.test(generatedPrompt));

    if (metaLeak) {
      issues.push({
        code: "meta_leakage",
        message: "Prompt contains prompt-engineering commentary or framework leakage"
      });
    }

    if (
      builtPrompt.rtlRequired &&
      (generatedPrompt.match(/[\u0600-\u06FF]/gu)?.length ?? 0) < 24
    ) {
      issues.push({
        code: "weak_arabic_output",
        message: "Arabic prompt does not contain enough Arabic-script content"
      });
    }

    if (
      builtPrompt.promptType !== "IMAGE_GENERATION" &&
      countWords(generatedPrompt) < Math.max(40, Math.floor(builtPrompt.wordCount * 0.72))
    ) {
      issues.push({
        code: "too_short",
        message: "Prompt is materially shorter than the expected quality baseline"
      });
    }

    issues.push(...this.collectSemanticCoverageIssues(generatedPrompt, builtPrompt));

    return issues;
  }

  private collectSemanticCoverageIssues(
    generatedPrompt: string,
    builtPrompt: BuiltPrompt
  ): PromptQualityIssue[] {
    const issues: PromptQualityIssue[] = [];
    const loweredPrompt = generatedPrompt.toLowerCase();
    const isArabic = builtPrompt.detectedLanguage === "ar";
    const validationTokens = isArabic ? ARABIC_VALIDATION_TOKENS : ENGLISH_VALIDATION_TOKENS;
    const sourcePolicyTokens = isArabic ? ARABIC_SOURCE_POLICY_TOKENS : ENGLISH_SOURCE_POLICY_TOKENS;
    const verificationTokens = isArabic ? ARABIC_VERIFICATION_TOKENS : ENGLISH_VERIFICATION_TOKENS;
    const responseBudgetTokens = isArabic ? ARABIC_RESPONSE_BUDGET_TOKENS : ENGLISH_RESPONSE_BUDGET_TOKENS;

    if (
      builtPrompt.sections.validationChecklist &&
      !validationTokens.every((token) => loweredPrompt.includes(token.toLowerCase()))
    ) {
      issues.push({
        code: "weak_validation_checklist",
        message: "Prompt is missing a strong validation checklist or self-check wording"
      });
    }

    if (
      builtPrompt.sections.sourcePolicy &&
      !sourcePolicyTokens.every((token) => loweredPrompt.includes(token.toLowerCase()))
    ) {
      issues.push({
        code: "weak_source_policy",
        message: "Prompt is missing explicit evidence, source, or uncertainty guidance"
      });
    }

    if (
      (builtPrompt.sections.verificationSteps || builtPrompt.sections.acceptanceTests) &&
      !verificationTokens.some((token) => loweredPrompt.includes(token.toLowerCase()))
    ) {
      issues.push({
        code: "weak_verification_coverage",
        message: "Prompt is missing strong verification or acceptance-test coverage"
      });
    }

    if (
      builtPrompt.sections.responseBudget &&
      !responseBudgetTokens.every((token) => loweredPrompt.includes(token.toLowerCase()))
    ) {
      issues.push({
        code: "weak_response_budget",
        message: "Prompt is missing explicit response-budget or concision guidance"
      });
    }

    return issues;
  }

  private extractStructureMarkers(prompt: string): string[] {
    return Array.from(
      new Set(
        Array.from(
          prompt.matchAll(/(^\[[^\n]+\]$)|(^<\/?[a-z-]+>$)/gimu),
          (match) => match[0]
        )
      )
    );
  }

  private async repairPrompt(
    rawInput: string,
    builtPrompt: BuiltPrompt,
    candidatePrompt: string,
    issues: PromptQualityIssue[]
  ): Promise<CompletionResult> {
    const requiredMarkers = this.extractStructureMarkers(builtPrompt.generatedPrompt);
    const repairPayload = JSON.stringify({
      rawInput,
      issues,
      requiredMarkers,
      promptDraft: builtPrompt.generatedPrompt,
      candidatePrompt
    });

    return this.generateCompletion({
      systemPrompt: this.getRepairSystemPrompt(),
      userContent: repairPayload,
      maxTokens: Math.min(1000, Math.max(500, estimateTokens(candidatePrompt) + 120))
    });
  }

  private buildCacheKey(rawInput: string, builtPrompt: BuiltPrompt): string {
    const hash = createHash("sha256")
      .update(PROMPT_CACHE_VERSION)
      .update(env.MISTRAL_MODEL)
      .update(rawInput)
      .update(builtPrompt.generatedPrompt)
      .digest("hex");

    return `promptforge:generated:${hash}`;
  }

  private shouldBypassEnhancement(_rawInput: string, builtPrompt: BuiltPrompt): boolean {
    if (builtPrompt.promptType === "IMAGE_GENERATION") {
      return true;
    }

    const universalMarkers = builtPrompt.detectedLanguage === "ar"
      ? ["[الدور]", "[الهدف]", "[المخرج المطلوب]", "[معايير النجاح]", "[قائمة التحقق]", "[سياسة الافتراضات]", "[منهج التنفيذ]"]
      : ["[ROLE]", "[OBJECTIVE]", "[DELIVERABLE]", "[SUCCESS CRITERIA]", "[VALIDATION CHECKLIST]", "[ASSUMPTION POLICY]", "[EXECUTION APPROACH]"];
    const hasUniversalContract = universalMarkers.every((marker) =>
      builtPrompt.generatedPrompt.includes(marker)
    );
    return hasUniversalContract;
  }

  private async getCachedResponse(cacheKey: string): Promise<CacheLookupResult> {
    const memoryCached = inMemoryPromptCache.get(cacheKey);

    if (memoryCached) {
      if (memoryCached.expiresAt > Date.now()) {
        return {
          payload: {
            generatedPrompt: memoryCached.generatedPrompt,
            wordCount: memoryCached.wordCount,
            estimatedTokens: memoryCached.estimatedTokens,
            source: "cache_memory",
            cacheStatus: "memory"
          },
          cacheStatus: "memory"
        };
      }

      inMemoryPromptCache.delete(cacheKey);
    }

    if (process.env.NODE_ENV === "test" || redis.status === "end") {
      return {
        payload: null,
        cacheStatus: "miss"
      };
    }

    try {
      const cached = await redis.get(cacheKey);

      if (!cached) {
        return {
          payload: null,
          cacheStatus: "miss"
        };
      }

      const parsed = cachedAiResponseSchema.parse(JSON.parse(cached));
      this.setInMemoryCache(cacheKey, parsed);
      return {
        payload: {
          ...parsed,
          source: "cache_redis",
          cacheStatus: "redis"
        },
        cacheStatus: "redis"
      };
    } catch (error) {
      logger.warn({ error, cacheKey }, "Prompt generation cache read failed");
      return {
        payload: null,
        cacheStatus: "miss"
      };
    }
  }

  private async setCachedResponse(
    cacheKey: string,
    payload: AIResponsePayload
  ): Promise<void> {
    this.setInMemoryCache(cacheKey, payload);

    if (process.env.NODE_ENV === "test" || redis.status === "end") {
      return;
    }

    try {
      await redis.set(cacheKey, JSON.stringify({
        generatedPrompt: payload.generatedPrompt,
        wordCount: payload.wordCount,
        estimatedTokens: payload.estimatedTokens
      }), "EX", PROMPT_CACHE_TTL_SECONDS);
    } catch (error) {
      logger.warn({ error, cacheKey }, "Prompt generation cache write failed");
    }
  }

  private setInMemoryCache(cacheKey: string, payload: AIResponsePayload): void {
    inMemoryPromptCache.set(cacheKey, {
      generatedPrompt: payload.generatedPrompt,
      wordCount: payload.wordCount,
      estimatedTokens: payload.estimatedTokens,
      expiresAt: Date.now() + PROMPT_CACHE_TTL_SECONDS * 1000
    });
  }

  private getSystemPrompt(): string {
    return [
      "You improve PromptForge drafts into paste-ready professional prompts for advanced AI systems and software teams.",
      "Use the raw input, the compact analysis, and the draft as scaffolding; rewrite aggressively when it improves clarity, completeness, or precision.",
      "Preserve strong structure when it already exists. Prefer a model-agnostic core with explicit objective, deliverable, decision rules, success criteria, constraints, failure modes, and execution approach.",
      "Add a validation checklist and assumption policy when they are missing or weak. For research or analysis prompts, make source policy and uncertainty handling explicit. For technical prompts, make verification steps and acceptance tests explicit. Add response-budget guidance when the draft could otherwise encourage truncated downstream answers.",
      "Keep the most important instructions early. Replace vague adjectives with explicit criteria or decision rules whenever possible.",
      "Prefer complete section coverage with concise bullets over over-explaining early sections. If the response could grow too long, compress wording rather than dropping required sections.",
      "Do not add prompt-engineering commentary, framework talk, or visible chain-of-thought. If deeper rigor is needed, instruct private reasoning and final-answer-only output.",
      "Use examples sparingly and only when they materially reduce ambiguity or improve format fidelity.",
      "Broad product or workflow ideas should become detailed multi-section execution prompts, not short summaries.",
      "If the brief involves children or learning, include age range assumptions, learning outcomes, safe engagement, privacy, accessibility, and adult oversight when relevant.",
      "When rtlRequired is true, write in Arabic except for code, APIs, product names, and unavoidable technical identifiers. Use Modern Standard Arabic and preserve RTL readability.",
      "For Claude targets, keep XML-friendly formatting. For ChatGPT targets, preserve system and user separation. For image targets, include style, lighting, composition, aspect ratio, and negative guidance.",
      "Keep section headings stable and professional. Prefer labels such as ROLE, OBJECTIVE, CONTEXT, TASK, DELIVERABLE, OUTPUT FORMAT, DECISION RULES, RESPONSE BUDGET, SUCCESS CRITERIA, VALIDATION CHECKLIST, ASSUMPTION POLICY, SOURCE POLICY, VERIFICATION STEPS, ACCEPTANCE TESTS, CONSTRAINTS, FAILURE MODES TO AVOID, and EXECUTION APPROACH.",
      "The value of generatedPrompt must be one plain string containing the full final prompt. Never return an object, array, section map, or decomposed plan inside generatedPrompt.",
      "Start directly with the first concrete heading. No meta lead-ins like 'Apply the framework precisely' or 'Transform the idea'.",
      "Return a valid JSON object with exactly { generatedPrompt } and no markdown fences.",
      "Return JSON only."
    ].join(" ");
  }

  private getRepairSystemPrompt(): string {
    return [
      "You repair prompt drafts that failed a quality gate.",
      "Fix only the listed issues while preserving the strongest parts of the candidate prompt.",
      "Keep required markers and headings exactly when they are provided.",
      "generatedPrompt must remain a single string, never a nested object or section map.",
      "Remove meta commentary, restore missing structure, improve clarity, and add response-budget guidance when later required sections risk being crowded out.",
      "Do not reveal chain-of-thought or add explanations outside the final prompt.",
      "Return a valid JSON object with exactly { generatedPrompt } and no markdown fences."
    ].join(" ");
  }

  private parseJsonPayload(text: string): ParsedAIResponse {
    try {
      const parsed = JSON.parse(text) as unknown;
      return aiResponseSchema.parse(parsed);
    } catch (error) {
      logger.warn(
        {
          error,
          preview: text.slice(0, 600)
        },
        "Mistral returned an invalid structured prompt payload"
      );
      throw error;
    }
  }
}

export const aiService = new AIService();
