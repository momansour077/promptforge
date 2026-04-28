import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

export const validateBody =
  <T>(schema: ZodType<T>): RequestHandler =>
  (request: Request, _response: Response, next: NextFunction) => {
    (request as unknown as { body: T }).body = schema.parse(request.body);
    next();
  };

export const validateQuery =
  <T>(schema: ZodType<T>): RequestHandler =>
  (request: Request, _response: Response, next: NextFunction) => {
    (request as unknown as { query: T }).query = schema.parse(request.query);
    next();
  };

export const validateParams =
  <T>(schema: ZodType<T>): RequestHandler =>
  (request: Request, _response: Response, next: NextFunction) => {
    (request as unknown as { params: T }).params = schema.parse(request.params);
    next();
  };
