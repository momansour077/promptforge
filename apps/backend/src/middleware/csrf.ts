import { randomBytes, timingSafeEqual } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";

import { AppError } from "./errorHandler.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const createCookieOptions = () => ({
  httpOnly: false,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  ...(env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== "localhost"
    ? { domain: env.COOKIE_DOMAIN }
    : {})
});

const createCsrfValue = (): string => randomBytes(24).toString("hex");

export const attachCsrfCookie = (
  request: Request,
  response: Response,
  next: NextFunction
): void => {
  const csrfValue =
    typeof request.cookies[env.CSRF_COOKIE_NAME] === "string"
      ? request.cookies[env.CSRF_COOKIE_NAME]
      : createCsrfValue();

  request.csrfTokenValue = csrfValue;

  if (request.cookies[env.CSRF_COOKIE_NAME] !== csrfValue) {
    response.cookie(env.CSRF_COOKIE_NAME, csrfValue, createCookieOptions());
  }

  response.setHeader("X-CSRF-Token", csrfValue);
  next();
};

export const requireCsrfToken = (
  request: Request,
  _response: Response,
  next: NextFunction
): void => {
  if (SAFE_METHODS.has(request.method)) {
    next();
    return;
  }

  const cookieToken = request.cookies[env.CSRF_COOKIE_NAME];
  const headerToken = request.header("x-csrf-token");

  if (typeof cookieToken !== "string" || typeof headerToken !== "string") {
    next(new AppError(403, "CSRF_TOKEN_INVALID", "Invalid CSRF token."));
    return;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    next(new AppError(403, "CSRF_TOKEN_INVALID", "Invalid CSRF token."));
    return;
  }

  next();
};

