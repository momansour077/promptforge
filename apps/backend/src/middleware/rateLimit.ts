import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import type { QuotaState, UserPlan } from "../types/index.js";

import { AppError } from "./errorHandler.js";

const getDayKey = (date = new Date()): string => date.toISOString().slice(0, 10);

const getResetAt = (date = new Date()): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);

const getTtlSeconds = (date = new Date()): number =>
  Math.max(1, Math.ceil((getResetAt(date) - date.getTime()) / 1000));

const getLimitByPlan = (plan: UserPlan): number | null => {
  if (plan === "FREE") {
    return env.RATE_LIMIT_FREE_DAILY;
  }

  if (plan === "PRO") {
    return env.RATE_LIMIT_PRO_DAILY;
  }

  return null;
};

const getQuotaKey = (userId: string, date = new Date()): string =>
  `quota:${userId}:${getDayKey(date)}`;

const syncDbUsageIfNeeded = async (userId: string, todayKey: string): Promise<number> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      promptsToday: true,
      lastResetDate: true
    }
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User account not found.");
  }

  const dbDayKey = getDayKey(user.lastResetDate);

  if (dbDayKey !== todayKey) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        promptsToday: 0,
        lastResetDate: new Date()
      }
    });

    return 0;
  }

  return user.promptsToday;
};

export const getQuotaState = async (
  userId: string,
  plan: UserPlan
): Promise<QuotaState> => {
  const limit = getLimitByPlan(plan);
  const resetAt = getResetAt();

  if (limit === null) {
    return {
      limit: null,
      used: 0,
      remaining: null,
      resetAt
    };
  }

  const quotaKey = getQuotaKey(userId);
  const cached = await redis.get(quotaKey);
  let used: number;

  if (cached !== null) {
    used = Number.parseInt(cached, 10);
  } else {
    used = await syncDbUsageIfNeeded(userId, getDayKey());
    await redis.set(quotaKey, String(used), "EX", getTtlSeconds());
  }

  return {
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    resetAt
  };
};

export const incrementPromptQuota = async (
  userId: string,
  plan: UserPlan
): Promise<QuotaState> => {
  const limit = getLimitByPlan(plan);
  const resetAt = getResetAt();

  if (limit === null) {
    return {
      limit: null,
      used: 0,
      remaining: null,
      resetAt
    };
  }

  const quotaKey = getQuotaKey(userId);
  const used = await redis.incr(quotaKey);

  if (used === 1) {
    await redis.expire(quotaKey, getTtlSeconds());
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      promptsToday: used,
      lastResetDate: new Date()
    }
  });

  return {
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    resetAt
  };
};

export const setQuotaHeaders = (response: Response, quota: QuotaState): void => {
  response.setHeader(
    "X-RateLimit-Remaining",
    quota.remaining === null ? "unlimited" : String(quota.remaining)
  );
  response.setHeader("X-RateLimit-Reset", String(quota.resetAt));
};

export const publicRateLimit = rateLimit({
  windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MS,
  max: env.PUBLIC_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, _response, next) => {
    next(
      new AppError(
        429,
        "PUBLIC_RATE_LIMIT_EXCEEDED",
        "Too many requests. Please try again later."
      )
    );
  }
});

export const promptQuotaGuard = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!request.authUser) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const quota = await getQuotaState(request.authUser.userId, request.authUser.plan);
    setQuotaHeaders(response, quota);

    if (quota.limit !== null && quota.used >= quota.limit) {
      throw new AppError(
        429,
        "PROMPT_QUOTA_EXCEEDED",
        "Daily prompt quota exceeded for the current plan."
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

