import { createHash } from "node:crypto";

import type { Request, Response } from "express";
import validator from "validator";

import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { aiService } from "../services/aiService.js";
import { promptBuilder } from "../services/promptBuilder.js";
import { incrementPromptQuota, setQuotaHeaders } from "../middleware/rateLimit.js";
import type { BuildInput, BuiltPrompt, GeneratePromptBody, RequestWithBody, SupportedLanguage, TargetAIValue } from "../types/index.js";
import { sendSuccess } from "../utils/responseHelper.js";

const GENERATED_PROMPT_CACHE_TTL_MS = 60 * 60 * 1000;
const GENERATED_PROMPT_CACHE_VERSION = "v2";

interface GeneratedPromptCacheEntry {
  expiresAt: number;
  generated: BuiltPrompt & {
    source?: string;
    cacheStatus?: string;
  };
}

declare global {

  var __promptforgeGeneratedPromptCache__:
    | Map<string, GeneratedPromptCacheEntry>
    | undefined;
}

const generatedPromptCache =
  globalThis.__promptforgeGeneratedPromptCache__ ??
  new Map<string, GeneratedPromptCacheEntry>();

if (process.env.NODE_ENV !== "production") {
  globalThis.__promptforgeGeneratedPromptCache__ = generatedPromptCache;
}

const connectTags = (tags: string[]) => ({
  connectOrCreate: tags.map((tag) => ({
    where: {
      name: tag
    },
    create: {
      name: tag
    }
  }))
});

const sanitizeRawInput = (rawInput: string): string =>
  validator.trim(validator.stripLow(rawInput, true));

const buildGeneratedPromptCacheKey = (buildInput: BuildInput): string =>
  createHash("sha256")
    .update(GENERATED_PROMPT_CACHE_VERSION)
    .update(JSON.stringify(buildInput))
    .digest("hex");

const buildGeneratedPrompt = async ({
  rawInput,
  preferredLanguage,
  promptType,
  tone,
  targetAI,
  includeExamples,
  includeChainOfThought
}: {
  rawInput: string;
  preferredLanguage?: SupportedLanguage;
  promptType?: BuildInput["promptType"];
  tone?: string;
  targetAI?: TargetAIValue;
  includeExamples?: boolean;
  includeChainOfThought?: boolean;
}) => {
  const buildInput: BuildInput = {
    rawInput,
    ...(preferredLanguage ? { preferredLanguage } : {}),
    ...(promptType ? { promptType } : {}),
    ...(tone ? { tone } : {}),
    ...(targetAI ? { targetAI } : {}),
    ...(includeExamples !== undefined ? { includeExamples } : {}),
    ...(includeChainOfThought !== undefined ? { includeChainOfThought } : {})
  };
  const cacheKey = buildGeneratedPromptCacheKey(buildInput);
  const cachedEntry = generatedPromptCache.get(cacheKey);

  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return {
      generated: cachedEntry.generated,
      fallbackError: null,
      cacheHit: true,
      cacheKey,
      source: "controller_cache",
      aiCacheStatus: cachedEntry.generated.cacheStatus ?? "skip"
    };
  }

  if (cachedEntry && cachedEntry.expiresAt <= Date.now()) {
    generatedPromptCache.delete(cacheKey);
  }

  const builtPrompt = promptBuilder.build(buildInput);

  let generated: BuiltPrompt & {
    source?: string;
    cacheStatus?: string;
  } = builtPrompt;

  try {
    const enhanced = await aiService.generatePrompt(rawInput, builtPrompt);
    generated = {
      ...builtPrompt,
      ...enhanced,
      sections: builtPrompt.sections,
      detectedLanguage: builtPrompt.detectedLanguage,
      outputFormat: builtPrompt.outputFormat
    };
  } catch (error) {
    generatedPromptCache.set(cacheKey, {
      generated: {
        ...builtPrompt,
        source: "builder_fallback",
        cacheStatus: "error"
      },
      expiresAt: Date.now() + GENERATED_PROMPT_CACHE_TTL_MS
    });

    return {
      generated: {
        ...builtPrompt,
        source: "builder_fallback",
        cacheStatus: "error"
      },
      fallbackError: error,
      cacheHit: false,
      cacheKey,
      source: "builder_fallback",
      aiCacheStatus: "error"
    };
  }

  generatedPromptCache.set(cacheKey, {
    generated,
    expiresAt: Date.now() + GENERATED_PROMPT_CACHE_TTL_MS
  });

  return {
    generated,
    fallbackError: null,
    cacheHit: false,
    cacheKey,
    source: generated.source ?? "mistral",
    aiCacheStatus: generated.cacheStatus ?? "miss"
  };
};

export const generatePrompt = async (request: RequestWithBody<GeneratePromptBody>, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const rawInput = sanitizeRawInput(request.body.rawInput);
  const { generated, fallbackError, cacheHit, cacheKey, source, aiCacheStatus } =
    await buildGeneratedPrompt({
    rawInput,
    preferredLanguage: request.authUser.language,
    ...(request.body.promptType ? { promptType: request.body.promptType } : {}),
    ...(request.body.tone ? { tone: request.body.tone } : {}),
    ...(request.body.targetAI ? { targetAI: request.body.targetAI } : {}),
    ...(request.body.includeExamples !== undefined
      ? { includeExamples: request.body.includeExamples }
      : {}),
    ...(request.body.includeChainOfThought !== undefined
      ? { includeChainOfThought: request.body.includeChainOfThought }
      : {})
    });

  if (fallbackError) {
    response.locals.aiFallbackError = fallbackError;
  }

  response.setHeader("X-PromptForge-Cache", cacheHit ? "HIT" : "MISS");
  response.setHeader("X-PromptForge-Cache-Key", cacheKey.slice(0, 16));
  response.setHeader("X-PromptForge-Source", source);
  response.setHeader("X-PromptForge-AI-Cache", aiCacheStatus);
  response.setHeader("X-PromptForge-Fallback", fallbackError ? "YES" : "NO");

  const prompt = await prisma.prompt.create({
    data: {
      userId: request.authUser.userId,
      rawInput,
      detectedLang: generated.detectedLanguage,
      outputPrompt: generated.generatedPrompt,
      promptType: generated.promptType,
      targetAI: generated.targetAISuggestion,
      tone: generated.tone,
      domain: generated.domain,
      tokensUsed: generated.estimatedTokens,
      tags: connectTags(generated.tags)
    },
    include: {
      tags: true
    }
  });

  const quota = await incrementPromptQuota(request.authUser.userId, request.authUser.plan);
  setQuotaHeaders(response, quota);

  return sendSuccess(response, {
    prompt,
    generated
  }, 201);
};

export const regeneratePrompt = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const promptId = String(request.params.id);
  const existingPrompt = await prisma.prompt.findFirst({
    where: {
      id: promptId,
      userId: request.authUser.userId
    },
    include: {
      tags: true
    }
  });

  if (!existingPrompt) {
    throw new AppError(404, "PROMPT_NOT_FOUND", "Prompt not found.");
  }

  const rawInput = sanitizeRawInput(existingPrompt.rawInput);
  const targetAI = existingPrompt.targetAI === "GENERAL" ? undefined : existingPrompt.targetAI;
  const { generated, fallbackError, cacheHit, cacheKey, source, aiCacheStatus } =
    await buildGeneratedPrompt({
    rawInput,
    preferredLanguage: existingPrompt.detectedLang as "en" | "ar",
    ...(targetAI ? { targetAI } : {})
    });

  if (fallbackError) {
    response.locals.aiFallbackError = fallbackError;
  }

  response.setHeader("X-PromptForge-Cache", cacheHit ? "HIT" : "MISS");
  response.setHeader("X-PromptForge-Cache-Key", cacheKey.slice(0, 16));
  response.setHeader("X-PromptForge-Source", source);
  response.setHeader("X-PromptForge-AI-Cache", aiCacheStatus);
  response.setHeader("X-PromptForge-Fallback", fallbackError ? "YES" : "NO");

  const prompt = await prisma.prompt.update({
    where: {
      id: existingPrompt.id
    },
    data: {
      rawInput,
      detectedLang: generated.detectedLanguage,
      outputPrompt: generated.generatedPrompt,
      promptType: generated.promptType,
      targetAI: generated.targetAISuggestion,
      tone: generated.tone,
      domain: generated.domain,
      tokensUsed: generated.estimatedTokens,
      tags: {
        set: [],
        ...connectTags(generated.tags)
      }
    },
    include: {
      tags: true
    }
  });

  const quota = await incrementPromptQuota(request.authUser.userId, request.authUser.plan);
  setQuotaHeaders(response, quota);

  return sendSuccess(response, {
    prompt,
    generated
  });
};

export const getPromptById = async (request: Request, response: Response): Promise<Response> => {
  const promptId = String(request.params.id);
  const prompt = await prisma.prompt.findUnique({
    where: {
      id: promptId
    },
    include: {
      tags: true,
      collection: true
    }
  });

  if (!prompt) {
    throw new AppError(404, "PROMPT_NOT_FOUND", "Prompt not found.");
  }

  if (!prompt.isPublic && prompt.userId !== request.authUser?.userId) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this prompt.");
  }

  return sendSuccess(response, { prompt });
};

export const toggleFavorite = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const promptId = String(request.params.id);
  const existingPrompt = await prisma.prompt.findFirst({
    where: {
      id: promptId,
      userId: request.authUser.userId
    }
  });

  if (!existingPrompt) {
    throw new AppError(404, "PROMPT_NOT_FOUND", "Prompt not found.");
  }

  const prompt = await prisma.prompt.update({
    where: {
      id: promptId
    },
    data: {
      isFavorited: !existingPrompt.isFavorited
    }
  });

  return sendSuccess(response, { prompt });
};

export const deletePrompt = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const promptId = String(request.params.id);
  const prompt = await prisma.prompt.findFirst({
    where: {
      id: promptId,
      userId: request.authUser.userId
    }
  });

  if (!prompt) {
    throw new AppError(404, "PROMPT_NOT_FOUND", "Prompt not found.");
  }

  await prisma.prompt.delete({
    where: {
      id: prompt.id
    }
  });

  return sendSuccess(response, {
    message: "Prompt deleted successfully."
  });
};

export const listPublicPrompts = async (request: Request, response: Response): Promise<Response> => {
  const page = Number.parseInt((request.query.page as string | undefined) ?? "1", 10);
  const limit = Number.parseInt((request.query.limit as string | undefined) ?? "10", 10);

  const [items, total] = await Promise.all([
    prisma.prompt.findMany({
      where: {
        isPublic: true
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tags: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.prompt.count({
      where: {
        isPublic: true
      }
    })
  ]);

  return sendSuccess(
    response,
    {
      items,
      total
    },
    200,
    {
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  );
};
