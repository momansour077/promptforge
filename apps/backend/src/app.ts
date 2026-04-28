import "express-async-errors";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import { prisma } from "./config/database.js";
import { env } from "./config/env.js";
import { connectRedis, redis } from "./config/redis.js";
import { requireCsrfToken, attachCsrfCookie } from "./middleware/csrf.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { publicRateLimit } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestLogger.js";
import routes from "./routes/index.js";
import { logger } from "./utils/logger.js";

const swaggerSpec = swaggerJsDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "PromptForge API",
      version: "1.0.0",
      description:
        "Production API for PromptForge. SQL injection protection is provided through Prisma's parameterized queries."
    },
    servers: [
      {
        url: env.API_BASE_PATH
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  apis: ["src/routes/*.ts"]
});

export const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);
  app.use(requestLogger);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS."));
      },
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(cookieParser());
  app.use(attachCsrfCookie);
  app.use(publicRateLimit);

  app.get("/health", (_request, response) => {
    response.status(200).json({ success: true, data: { status: "ok" } });
  });

  app.use(`${env.API_BASE_PATH}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(env.API_BASE_PATH, requireCsrfToken, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const app = createApp();

const start = async (): Promise<void> => {
  await prisma.$connect();
  await connectRedis();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "PromptForge backend is listening");
  });

  const shutdown = async (): Promise<void> => {
    logger.info("Shutting down PromptForge backend");
    server.close();
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
};

if (process.env.NODE_ENV !== "test") {
  void start();
}

export default app;
