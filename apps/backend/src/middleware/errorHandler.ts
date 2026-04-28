import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { sendError } from "../utils/responseHelper.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string | string[]>;

  public constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, string | string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    if (details) {
      this.details = details;
    }
  }
}

const formatZodError = (error: ZodError): Record<string, string[]> =>
  error.issues.reduce<Record<string, string[]>>((accumulator, issue) => {
    const key = issue.path.join(".") || "root";
    accumulator[key] = accumulator[key] ?? [];
    accumulator[key].push(issue.message);
    return accumulator;
  }, {});

interface ErrorWithCode {
  code?: string;
}

const isErrorWithCode = (value: unknown): value is ErrorWithCode =>
  typeof value === "object" && value !== null && "code" in value;

export const notFoundHandler = (_request: Request, _response: Response, next: NextFunction): void => {
  next(new AppError(404, "NOT_FOUND", "The requested resource was not found."));
};

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): Response => {
  if (error instanceof AppError) {
    return sendError(
      response,
      {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      },
      error.statusCode
    );
  }

  if (error instanceof ZodError) {
    return sendError(
      response,
      {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: formatZodError(error)
      },
      422
    );
  }

  if (isErrorWithCode(error) && error.code === "P2002") {
    return sendError(
      response,
      {
        code: "CONFLICT",
        message: "A unique constraint was violated."
      },
      409
    );
  }

  logger.error({ error }, "Unhandled application error");

  return sendError(
    response,
    {
      code: "INTERNAL_SERVER_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected error occurred."
          : error instanceof Error
            ? error.message
            : "An unexpected error occurred."
    },
    500
  );
};
