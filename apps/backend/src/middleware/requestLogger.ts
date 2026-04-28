import type { NextFunction, Request, Response } from "express";

import { logger } from "../utils/logger.js";

export const requestLogger = (request: Request, response: Response, next: NextFunction): void => {
  const startedAt = Date.now();

  response.on("finish", () => {
    const payload = {
      method: request.method,
      url: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt
    };

    if (response.statusCode >= 500) {
      logger.error(payload, "HTTP request completed");
      return;
    }

    if (response.statusCode >= 400) {
      logger.warn(payload, "HTTP request completed");
      return;
    }

    logger.info(payload, "HTTP request completed");
  });

  next();
};
