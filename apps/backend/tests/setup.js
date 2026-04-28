process.env.NODE_ENV = "test";
process.env.PORT = process.env.PORT ?? "4000";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://promptforge:promptforge@localhost:5432/promptforge?schema=public";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123456";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123456";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? "test-mistral-key";
process.env.MISTRAL_BASE_URL =
  process.env.MISTRAL_BASE_URL ?? "https://api.mistral.ai/v1";
process.env.MISTRAL_MODEL =
  process.env.MISTRAL_MODEL ?? "mistral-large-latest";
process.env.RATE_LIMIT_FREE_DAILY = process.env.RATE_LIMIT_FREE_DAILY ?? "2";
process.env.RATE_LIMIT_PRO_DAILY = process.env.RATE_LIMIT_PRO_DAILY ?? "5";
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? "http://localhost:5173";
process.env.COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? "localhost";
process.env.ACCESS_COOKIE_NAME = process.env.ACCESS_COOKIE_NAME ?? "promptforge_access";
process.env.REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? "promptforge_refresh";
process.env.CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME ?? "promptforge_csrf";
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "error";
process.env.PUBLIC_RATE_LIMIT_WINDOW_MS = process.env.PUBLIC_RATE_LIMIT_WINDOW_MS ?? "900000";
process.env.PUBLIC_RATE_LIMIT_MAX = process.env.PUBLIC_RATE_LIMIT_MAX ?? "100";
process.env.API_BASE_PATH = process.env.API_BASE_PATH ?? "/api";
