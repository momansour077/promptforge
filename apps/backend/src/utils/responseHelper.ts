import type { Response } from "express";

import type { ApiErrorShape } from "../types/index.js";

export const sendSuccess = <T>(
  response: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
): Response =>
  response.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {})
  });

export const sendError = (
  response: Response,
  error: ApiErrorShape,
  statusCode = 400
): Response =>
  response.status(statusCode).json({
    success: false,
    error
  });

