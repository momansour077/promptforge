import { jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

const store = new Map<string, string>();
const unstableMockModule = (
  jest as unknown as {
    unstable_mockModule: <T>(moduleName: string, factory: () => T) => void;
  }
).unstable_mockModule;

const prismaMock = {
  user: {
    findUnique: jest.fn(async () => ({
      promptsToday: 0,
      lastResetDate: new Date()
    })),
    update: jest.fn(async ({ data }: { data: { promptsToday: number; lastResetDate: Date } }) => ({
      promptsToday: data.promptsToday,
      lastResetDate: data.lastResetDate
    }))
  }
};

const redisMock = {
  get: jest.fn(async (key: string) => store.get(key) ?? null),
  set: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
    return "OK";
  }),
  incr: jest.fn(async (key: string) => {
    const nextValue = Number.parseInt(store.get(key) ?? "0", 10) + 1;
    store.set(key, String(nextValue));
    return nextValue;
  }),
  expire: jest.fn(async () => 1)
};

unstableMockModule("../../src/config/database.js", () => ({
  prisma: prismaMock
}));

unstableMockModule("../../src/config/redis.js", () => ({
  redis: redisMock
}));

describe("rateLimit", () => {
  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it("increments usage and blocks when the free plan limit is reached", async () => {
    const { incrementPromptQuota, promptQuotaGuard } = await import(
      "../../src/middleware/rateLimit.js"
    );

    await incrementPromptQuota("user-1", "FREE");
    await incrementPromptQuota("user-1", "FREE");

    const request = {
      authUser: {
        userId: "user-1",
        email: "test@example.com",
        plan: "FREE",
        language: "en"
      }
    } as Request;
    const setHeader = jest.fn();
    const response = {
      setHeader
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await promptQuotaGuard(request, response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "PROMPT_QUOTA_EXCEEDED"
      })
    );
    expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "0");
  });
});
