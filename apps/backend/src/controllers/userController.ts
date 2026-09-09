import type { Request, Response } from "express";
import type { ProfileBody, PasswordBody } from "../routes/userRoutes.js";
import type { RequestWithBody } from "../types/index.js";
import validator from "validator";

import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { getQuotaState } from "../middleware/rateLimit.js";
import { comparePassword, hashPassword } from "../utils/hashHelper.js";
import { sendSuccess } from "../utils/responseHelper.js";
import { serializeUser } from "../utils/userSerializer.js";

const buildDailyUsage = async (userId: string): Promise<{ date: string; count: number }[]> => {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 29);
  start.setUTCHours(0, 0, 0, 0);

  const prompts = await prisma.prompt.findMany({
    where: {
      userId,
      createdAt: {
        gte: start
      }
    },
    select: {
      createdAt: true
    }
  });

  const counts = new Map<string, number>();

  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    counts.set(date.toISOString().slice(0, 10), 0);
  }

  prompts.forEach((prompt: { createdAt: Date }) => {
    const key = prompt.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([date, count]) => ({
    date,
    count
  }));
};

export const getStats = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const [totalPrompts, favoriteCount, tokenAggregate, dailyUsage] = await Promise.all([
    prisma.prompt.count({
      where: { userId: request.authUser.userId }
    }),
    prisma.prompt.count({
      where: { userId: request.authUser.userId, isFavorited: true }
    }),
    prisma.prompt.aggregate({
      where: { userId: request.authUser.userId },
      _sum: { tokensUsed: true }
    }),
    buildDailyUsage(request.authUser.userId)
  ]);

  return sendSuccess(response, {
    totalPrompts,
    favoriteCount,
    tokensUsed: tokenAggregate._sum.tokensUsed ?? 0,
    dailyUsage
  });
};

export const updateProfile = async (request: RequestWithBody<ProfileBody>, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const name = request.body.name ? validator.trim(request.body.name) : null;
  const language = request.body.language;

  const user = await prisma.user.update({
    where: {
      id: request.authUser.userId
    },
    data: {
      name,
      language
    }
  });

  return sendSuccess(response, { user: serializeUser(user) });
};

export const changePassword = async (request: RequestWithBody<PasswordBody>, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: request.authUser.userId
    }
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User account not found.");
  }

  const matches = await comparePassword(request.body.currentPassword, user.passwordHash);

  if (!matches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect.");
  }

  const passwordHash = await hashPassword(request.body.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        passwordHash
      }
    }),
    prisma.refreshToken.deleteMany({
      where: {
        userId: user.id
      }
    })
  ]);

  return sendSuccess(response, {
    message: "Password updated successfully. Please sign in again."
  });
};

export const getQuota = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const quota = await getQuotaState(request.authUser.userId, request.authUser.plan);

  return sendSuccess(response, { quota });
};
