import { Redis } from "ioredis";

import { env } from "./env.js";

import { logger } from "../utils/logger.js";

declare global {

  var __promptforgeRedis__: Redis | undefined;
}

export const redis =
  globalThis.__promptforgeRedis__ ??
  new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableAutoPipelining: true
  });

redis.on("error", (error: unknown) => {
  logger.error({ error }, "Redis connection error");
});

if (process.env.NODE_ENV !== "production") {
  globalThis.__promptforgeRedis__ = redis;
}

export const connectRedis = async (): Promise<void> => {
  if (redis.status === "wait") {
    await redis.connect();
  }
};
