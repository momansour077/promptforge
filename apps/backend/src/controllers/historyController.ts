import { type PromptType } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { sendSuccess } from "../utils/responseHelper.js";

const buildHistoryWhere = (
  userId: string,
  query: Request["query"]
): {
  userId: string;
  promptType?: PromptType;
  detectedLang?: string;
  isFavorited?: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
} => {
  const where: {
    userId: string;
    promptType?: PromptType;
    detectedLang?: string;
    isFavorited?: boolean;
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
  } = {
    userId
  };

  if (typeof query.promptType === "string") {
    where.promptType = query.promptType as PromptType;
  }

  if (typeof query.language === "string") {
    where.detectedLang = query.language;
  }

  if (typeof query.favorited === "string") {
    where.isFavorited = query.favorited === "true";
  }

  if (typeof query.startDate === "string" || typeof query.endDate === "string") {
    where.createdAt = {};

    if (typeof query.startDate === "string") {
      where.createdAt.gte = new Date(query.startDate);
    }

    if (typeof query.endDate === "string") {
      where.createdAt.lte = new Date(query.endDate);
    }
  }

  return where;
};

export const listHistory = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const page = Number.parseInt((request.query.page as string | undefined) ?? "1", 10);
  const limit = Number.parseInt((request.query.limit as string | undefined) ?? "10", 10);
  const sortBy = (request.query.sortBy as string | undefined) ?? "newest";
  const where = buildHistoryWhere(request.authUser.userId, request.query);
  const orderBy =
    sortBy === "oldest"
      ? { createdAt: "asc" as const }
      : sortBy === "most_tokens"
        ? { tokensUsed: "desc" as const }
        : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.prompt.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tags: true,
        collection: true
      }
    }),
    prisma.prompt.count({ where })
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
