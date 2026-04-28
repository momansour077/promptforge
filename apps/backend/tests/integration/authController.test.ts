import { jest } from "@jest/globals";
import supertest from "supertest";

const unstableMockModule = (
  jest as unknown as {
    unstable_mockModule: <T>(moduleName: string, factory: () => T) => void;
  }
).unstable_mockModule;

const users = new Map<string, {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  language: "en" | "ar";
  plan: "FREE";
  promptsToday: number;
  createdAt: Date;
  updatedAt: Date;
}>();
const refreshTokens = new Map<string, {
  token: string;
  userId: string;
  expiresAt: Date;
}>();
const refreshSessions = new Map<string, string>();

const prismaMock = {
  user: {
    findUnique: jest.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) {
        return Array.from(users.values()).find((user) => user.id === where.id) ?? null;
      }

      if (where.email) {
        return Array.from(users.values()).find((user) => user.email === where.email) ?? null;
      }

      return null;
    }),
    create: jest.fn(async ({ data }: { data: { email: string; passwordHash: string; name: string | null; language: "en" | "ar" } }) => {
      const now = new Date();
      const user = {
        id: `user-${users.size + 1}`,
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        language: data.language,
        plan: "FREE" as const,
        promptsToday: 0,
        createdAt: now,
        updatedAt: now
      };
      users.set(user.id, user);
      return user;
    })
  },
  refreshToken: {
    create: jest.fn(async ({ data }: { data: { token: string; userId: string; expiresAt: Date } }) => {
      const record = {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt
      };
      refreshTokens.set(data.token, record);
      return {
        id: `refresh-${refreshTokens.size}`,
        ...record,
        createdAt: new Date()
      };
    }),
    findUnique: jest.fn(async ({ where }: { where: { token: string } }) => {
      const record = refreshTokens.get(where.token);

      if (!record) {
        return null;
      }

      return {
        id: `refresh-${where.token}`,
        token: record.token,
        userId: record.userId,
        expiresAt: record.expiresAt,
        createdAt: new Date(),
        user: users.get(record.userId) ?? null
      };
    }),
    deleteMany: jest.fn(async ({ where }: { where: { token?: string; userId?: string } }) => {
      let count = 0;

      Array.from(refreshTokens.entries()).forEach(([token, record]) => {
        if ((where.token && token === where.token) || (where.userId && record.userId === where.userId)) {
          refreshTokens.delete(token);
          count += 1;
        }
      });

      return { count };
    }),
    delete: jest.fn(async ({ where }: { where: { token: string } }) => {
      const record = refreshTokens.get(where.token);

      if (!record) {
        throw new Error("Token missing");
      }

      refreshTokens.delete(where.token);
      return record;
    })
  },
  $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  $connect: jest.fn(async () => undefined),
  $disconnect: jest.fn(async () => undefined)
};

const redisMock = {
  status: "ready",
  on: jest.fn(),
  connect: jest.fn(async () => undefined),
  quit: jest.fn(async () => undefined),
  set: jest.fn(async (key: string, value: string) => {
    refreshSessions.set(key, value);
    return "OK";
  }),
  get: jest.fn(async (key: string) => refreshSessions.get(key) ?? null),
  del: jest.fn(async (key: string) => {
    refreshSessions.delete(key);
    return 1;
  })
};

unstableMockModule("../../src/config/database.js", () => ({
  prisma: prismaMock
}));

unstableMockModule("../../src/config/redis.js", () => ({
  redis: redisMock,
  connectRedis: jest.fn(async () => undefined)
}));

describe("authController integration", () => {
  beforeEach(() => {
    users.clear();
    refreshTokens.clear();
    refreshSessions.clear();
    jest.clearAllMocks();
  });

  it("supports register, login, refresh, and logout through the API", async () => {
    const { createApp } = await import("../../src/app.js");
    const agent = supertest.agent(createApp());

    const healthResponse = await agent.get("/health");
    const rawSetCookieHeader = healthResponse.headers["set-cookie"];
    const setCookieHeader = Array.isArray(rawSetCookieHeader)
      ? rawSetCookieHeader
      : [rawSetCookieHeader];
    const csrfCookie = setCookieHeader.find((cookie) => cookie?.startsWith("promptforge_csrf="));
    const csrfToken = csrfCookie?.split(";")[0].split("=")[1];

    expect(csrfToken).toBeDefined();

    const registerResponse = await agent
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("x-csrf-token", csrfToken as string)
      .send({
        email: "user@example.com",
        password: "super-secret-password",
        name: "Prompt User",
        language: "en"
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.user.email).toBe("user@example.com");

    const loginResponse = await agent
      .post("/api/auth/login")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("x-csrf-token", csrfToken as string)
      .send({
        email: "user@example.com",
        password: "super-secret-password"
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.user.email).toBe("user@example.com");

    const refreshResponse = await agent
      .post("/api/auth/refresh")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("x-csrf-token", csrfToken as string)
      .send({});

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.user.id).toBe("user-1");

    const logoutResponse = await agent
      .post("/api/auth/logout")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("x-csrf-token", csrfToken as string)
      .send({});

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.data.message).toMatch(/Logged out/i);
  }, 20000);
});
