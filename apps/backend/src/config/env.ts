import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(2),
  JWT_REFRESH_EXPIRES_IN: z.string().min(2),
  MISTRAL_API_KEY: z.string().min(10),
  MISTRAL_BASE_URL: z.string().url().default("https://api.mistral.ai/v1"),
  MISTRAL_MODEL: z.string().min(1).default("mistral-large-latest"),
  RATE_LIMIT_FREE_DAILY: z.coerce.number().int().positive(),
  RATE_LIMIT_PRO_DAILY: z.coerce.number().int().positive(),
  FRONTEND_URL: z.string().url(),
  CORS_ORIGINS: z.string().min(1),
  COOKIE_DOMAIN: z.string().default(""),
  ACCESS_COOKIE_NAME: z.string().default("promptforge_access"),
  REFRESH_COOKIE_NAME: z.string().default("promptforge_refresh"),
  CSRF_COOKIE_NAME: z.string().default("promptforge_csrf"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  PUBLIC_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  API_BASE_PATH: z.string().default("/api")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const rawEnv = parsedEnv.data;

export const env = {
  ...rawEnv,
  CORS_ORIGINS: rawEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim())
};

export type AppEnv = typeof env;
