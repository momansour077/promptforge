import { asAsync } from "../helpers/asyncMock.js";
import { jest } from "@jest/globals";
import supertest from "supertest";

import { issueAuthTokens } from "../../src/utils/jwtHelper.js";

const unstableMockModule = (
  jest as unknown as {
    unstable_mockModule: <T>(moduleName: string, factory: () => T) => void;
  }
).unstable_mockModule;

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  language: "en" | "ar";
  plan: "FREE";
  promptsToday: number;
  createdAt: Date;
  updatedAt: Date;
  lastResetDate: Date;
}

interface PromptRecord {
  id: string;
  userId: string;
  rawInput: string;
  detectedLang: "en" | "ar";
  outputPrompt: string;
  promptType: "CREATIVE_WRITING" | "CODE_GENERATION" | "GENERAL";
  targetAI: "GENERAL" | "CHATGPT" | "CLAUDE" | "GEMINI" | "COPILOT";
  tone: string | null;
  domain: string | null;
  tokensUsed: number;
  isFavorited: boolean;
  isPublic: boolean;
  collectionId: string | null;
  createdAt: Date;
  tags: { id: string; name: string }[];
}

const users = new Map<string, UserRecord>();
const prompts = new Map<string, PromptRecord>();
const quotaStore = new Map<string, string>();
const tagsByName = new Map<string, { id: string; name: string }>();

const prismaMock = {
  user: {
    findUnique: jest.fn(asAsync( ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) {
        return users.get(where.id) ?? null;
      }

      if (where.email) {
        return Array.from(users.values()).find((user) => user.email === where.email) ?? null;
      }

      return null;
    })),
    update: jest.fn(asAsync( ({ where, data }: { where: { id: string }; data: { promptsToday: number; lastResetDate: Date } }) => {
      const user = users.get(where.id);

      if (!user) {
        throw new Error("User missing");
      }

      const updated = {
        ...user,
        promptsToday: data.promptsToday,
        lastResetDate: data.lastResetDate,
        updatedAt: new Date()
      };
      users.set(where.id, updated);
      return updated;
    }))
  },
  prompt: {
    findFirst: jest.fn(asAsync( ({ where }: { where: { id: string; userId: string } }) => {
      const prompt = prompts.get(where.id);
      return prompt?.userId === where.userId ? prompt : null;
    })),
    update: jest.fn(asAsync( ({
      where,
      data
    }: {
      where: { id: string };
      data: {
        rawInput: string;
        detectedLang: "en" | "ar";
        outputPrompt: string;
        promptType: PromptRecord["promptType"];
        targetAI: PromptRecord["targetAI"];
        tone: string;
        domain: string;
        tokensUsed: number;
        tags: {
          set: [];
          connectOrCreate: {
            where: { name: string };
            create: { name: string };
          }[];
        };
      };
    }) => {
      const prompt = prompts.get(where.id);

      if (!prompt) {
        throw new Error("Prompt missing");
      }

      const nextTags = data.tags.connectOrCreate.map(({ create }) => {
        const existing = tagsByName.get(create.name);

        if (existing) {
          return existing;
        }

        const tag = {
          id: `tag-${tagsByName.size + 1}`,
          name: create.name
        };
        tagsByName.set(tag.name, tag);
        return tag;
      });

      const updated: PromptRecord = {
        ...prompt,
        rawInput: data.rawInput,
        detectedLang: data.detectedLang,
        outputPrompt: data.outputPrompt,
        promptType: data.promptType,
        targetAI: data.targetAI,
        tone: data.tone,
        domain: data.domain,
        tokensUsed: data.tokensUsed,
        tags: nextTags
      };

      prompts.set(where.id, updated);
      return updated;
    }))
  },
  $connect: jest.fn(asAsync( () => undefined)),
  $disconnect: jest.fn(asAsync( () => undefined))
};

const redisMock = {
  status: "ready",
  on: jest.fn(),
  connect: jest.fn(asAsync( () => undefined)),
  quit: jest.fn(asAsync( () => undefined)),
  get: jest.fn(asAsync( (key: string) => quotaStore.get(key) ?? null)),
  set: jest.fn(asAsync( (key: string, value: string) => {
    quotaStore.set(key, value);
    return "OK";
  })),
  del: jest.fn(asAsync( (key: string) => {
    quotaStore.delete(key);
    return 1;
  })),
  incr: jest.fn(asAsync( (key: string) => {
    const nextValue = (Number.parseInt(quotaStore.get(key) ?? "0", 10) || 0) + 1;
    quotaStore.set(key, String(nextValue));
    return nextValue;
  })),
  expire: jest.fn(asAsync( () => 1))
};

const aiServiceMock = {
  generatePrompt: jest.fn(asAsync( (_rawInput: string, builtPrompt: { generatedPrompt: string; wordCount: number; estimatedTokens: number }) => ({
    generatedPrompt: builtPrompt.generatedPrompt,
    wordCount: builtPrompt.wordCount,
    estimatedTokens: builtPrompt.estimatedTokens
  })))
};

unstableMockModule("../../src/config/database.js", () => ({
  prisma: prismaMock
}));

unstableMockModule("../../src/config/redis.js", () => ({
  redis: redisMock,
  connectRedis: jest.fn(asAsync( () => undefined))
}));

unstableMockModule("../../src/services/aiService.js", () => ({
  aiService: aiServiceMock
}));

describe("prompt regeneration integration", () => {
  beforeEach(() => {
    users.clear();
    prompts.clear();
    quotaStore.clear();
    tagsByName.clear();
    jest.clearAllMocks();

    const now = new Date();
    users.set("user-1", {
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hashed",
      name: "Prompt User",
      language: "en",
      plan: "FREE",
      promptsToday: 0,
      createdAt: now,
      updatedAt: now,
      lastResetDate: now
    });

    prompts.set("prompt-1", {
      id: "prompt-1",
      userId: "user-1",
      rawInput: "Write a blog post about coffee for startup founders",
      detectedLang: "en",
      outputPrompt: "Apply the Task, Role, Audience, Create, Execute framework precisely.",
      promptType: "CREATIVE_WRITING",
      targetAI: "GENERAL",
      tone: "Professional",
      domain: "marketing",
      tokensUsed: 120,
      isFavorited: true,
      isPublic: false,
      collectionId: null,
      createdAt: now,
      tags: [{ id: "tag-legacy", name: "legacy" }]
    });
  });

  it("regenerates a stored prompt in place using the latest builder standard", async () => {
    const { createApp } = await import("../../src/app.js");
    const agent = supertest.agent(createApp());

    const healthResponse = await agent.get("/health");
    const rawSetCookieHeader: unknown = healthResponse.headers["set-cookie"];
    const setCookieHeader = Array.isArray(rawSetCookieHeader)
      ? rawSetCookieHeader.filter((value): value is string => typeof value === "string")
      : typeof rawSetCookieHeader === "string" ? [rawSetCookieHeader] : [];
    const csrfCookie = setCookieHeader.find((cookie) => cookie?.startsWith("promptforge_csrf="));
    const csrfToken = csrfCookie?.split(";")[0]?.split("=")[1];

    expect(csrfToken).toBeDefined();

    const tokens = issueAuthTokens({
      userId: "user-1",
      email: "user@example.com",
      plan: "FREE",
      language: "en"
    });

    const regenerateResponse = await agent
      .post("/api/prompts/prompt-1/regenerate")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("x-csrf-token", csrfToken!)
      .set("Cookie", `promptforge_access=${tokens.accessToken}; promptforge_csrf=${csrfToken}`)
      .send({});

    expect(regenerateResponse.status).toBe(200);
    expect(regenerateResponse.body).toHaveProperty("data.prompt.id", "prompt-1");
    expect(regenerateResponse.body).toHaveProperty("data.prompt.outputPrompt", expect.stringContaining("[ROLE]"));
    expect(regenerateResponse.body).toHaveProperty("data.prompt.outputPrompt", expect.stringContaining("[TASK]"));
    expect(regenerateResponse.body).toHaveProperty("data.prompt.outputPrompt", expect.not.stringContaining("Apply the Task, Role, Audience"));
    expect(regenerateResponse.body).toHaveProperty("data.prompt.isFavorited", true);
    expect(regenerateResponse.body).toHaveProperty("data.generated.generatedPrompt", expect.stringContaining("[ROLE]"));
    expect(aiServiceMock.generatePrompt).toHaveBeenCalledTimes(1);
    expect(redisMock.incr).toHaveBeenCalledTimes(1);
    expect(regenerateResponse.headers["x-ratelimit-remaining"]).toBe("1");
  });
});
