import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/jwtHelper.js";

import { AppError } from "./errorHandler.js";

const extractBearerToken = (request: Request): string | null => {
  const authorization = request.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.replace("Bearer ", "").trim();
};

export const requireAuth = (
  request: Request,
  _response: Response,
  next: NextFunction
): void => {
  try {
    const cookieToken = request.cookies[env.ACCESS_COOKIE_NAME] as string | undefined;
    const token = cookieToken ?? extractBearerToken(request);

    if (!token) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const payload = verifyAccessToken(token);
    request.authUser = {
      userId: payload.sub,
      email: payload.email,
      plan: payload.plan,
      language: payload.language
    };

    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(401, "UNAUTHORIZED", "Your session is invalid or expired.")
    );
  }
};
