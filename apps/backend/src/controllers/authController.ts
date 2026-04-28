import type { Request, Response } from "express";
import validator from "validator";

import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { AppError } from "../middleware/errorHandler.js";
import { comparePassword, generateOpaqueId, hashPassword, hashToken } from "../utils/hashHelper.js";
import {
  clearAuthCookies,
  issueAuthTokens,
  setAuthCookies,
  verifyRefreshToken
} from "../utils/jwtHelper.js";
import { sendSuccess } from "../utils/responseHelper.js";

const serializeUser = (user: {
  id: string;
  email: string;
  name: string | null;
  language: string;
  plan: string;
  promptsToday: number;
  createdAt: Date;
  updatedAt: Date;
}): {
  id: string;
  email: string;
  name: string | null;
  language: string;
  plan: string;
  promptsToday: number;
  createdAt: string;
  updatedAt: string;
} => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString()
});

const getRefreshKey = (tokenHashValue: string): string => `session:refresh:${tokenHashValue}`;

const getRefreshExpiry = (payload: ReturnType<typeof verifyRefreshToken>): Date => {
  if (payload.exp === undefined) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is missing an expiry.");
  }

  return new Date(payload.exp * 1000);
};

const storeRefreshSession = async (
  tokenHashValue: string,
  userId: string,
  expiresAt: Date
): Promise<void> => {
  const ttlSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  await redis.set(getRefreshKey(tokenHashValue), userId, "EX", ttlSeconds);
};

const deleteRefreshSession = async (tokenHashValue: string): Promise<void> => {
  await redis.del(getRefreshKey(tokenHashValue));
};

const persistRefreshToken = async (
  refreshToken: string,
  userId: string
): Promise<void> => {
  const payload = verifyRefreshToken(refreshToken);
  const expiresAt = getRefreshExpiry(payload);
  const tokenHashValue = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      id: generateOpaqueId(),
      token: tokenHashValue,
      userId,
      expiresAt
    }
  });

  await storeRefreshSession(tokenHashValue, userId, expiresAt);
};

const removeRefreshToken = async (refreshToken: string): Promise<void> => {
  const tokenHashValue = hashToken(refreshToken);

  await prisma.refreshToken.deleteMany({
    where: {
      token: tokenHashValue
    }
  });

  await deleteRefreshSession(tokenHashValue);
};

export const register = async (request: Request, response: Response): Promise<Response> => {
  const normalizedEmail = validator.normalizeEmail(request.body.email);
  const email = typeof normalizedEmail === "string" ? normalizedEmail : "";
  const name = request.body.name ? validator.trim(request.body.name) : null;
  const password = request.body.password;
  const language = request.body.language;

  if (!email) {
    throw new AppError(422, "INVALID_EMAIL", "A valid email address is required.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AppError(409, "EMAIL_IN_USE", "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      language
    }
  });

  const tokens = issueAuthTokens({
    userId: user.id,
    email: user.email,
    language: user.language as "en" | "ar",
    plan: user.plan
  });

  await persistRefreshToken(tokens.refreshToken, user.id);
  setAuthCookies(response, tokens);

  return sendSuccess(response, {
    user: serializeUser(user)
  }, 201);
};

export const login = async (request: Request, response: Response): Promise<Response> => {
  const normalizedEmail = validator.normalizeEmail(request.body.email);
  const email = typeof normalizedEmail === "string" ? normalizedEmail : "";
  const password = request.body.password;

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  const tokens = issueAuthTokens({
    userId: user.id,
    email: user.email,
    language: user.language as "en" | "ar",
    plan: user.plan
  });

  await persistRefreshToken(tokens.refreshToken, user.id);
  setAuthCookies(response, tokens);

  return sendSuccess(response, {
    user: serializeUser(user)
  });
};

export const refresh = async (request: Request, response: Response): Promise<Response> => {
  const refreshToken = request.cookies[env.REFRESH_COOKIE_NAME] as string | undefined;

  if (!refreshToken) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is missing.");
  }

  const payload = verifyRefreshToken(refreshToken);
  const refreshTokenHash = hashToken(refreshToken);
  const cachedUserId = await redis.get(getRefreshKey(refreshTokenHash));

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      token: refreshTokenHash
    },
    include: {
      user: true
    }
  });

  if (!storedToken || storedToken.expiresAt < new Date() || storedToken.userId !== payload.sub) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is invalid or expired.");
  }

  if (cachedUserId !== null && cachedUserId !== storedToken.userId) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh session is invalid.");
  }

  const tokens = issueAuthTokens({
    userId: storedToken.user.id,
    email: storedToken.user.email,
    language: storedToken.user.language as "en" | "ar",
    plan: storedToken.user.plan
  });

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({
      where: {
        token: refreshTokenHash
      }
    }),
    prisma.refreshToken.create({
      data: {
        token: hashToken(tokens.refreshToken),
        userId: storedToken.user.id,
        expiresAt: getRefreshExpiry(verifyRefreshToken(tokens.refreshToken))
      }
    })
  ]);

  await deleteRefreshSession(refreshTokenHash);
  await storeRefreshSession(
    hashToken(tokens.refreshToken),
    storedToken.user.id,
    getRefreshExpiry(verifyRefreshToken(tokens.refreshToken))
  );
  setAuthCookies(response, tokens);

  return sendSuccess(response, {
    user: serializeUser(storedToken.user)
  });
};

export const logout = async (request: Request, response: Response): Promise<Response> => {
  const refreshToken = request.cookies[env.REFRESH_COOKIE_NAME] as string | undefined;

  if (refreshToken) {
    await removeRefreshToken(refreshToken);
  }

  clearAuthCookies(response);

  return sendSuccess(response, {
    message: "Logged out successfully."
  });
};

export const me = async (request: Request, response: Response): Promise<Response> => {
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

  return sendSuccess(response, {
    user: serializeUser(user)
  });
};
