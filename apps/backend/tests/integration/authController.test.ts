import { asAsync } from "../helpers/asyncMock.js";
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
    update: jest.fn(asAsync(({ where, data }: {
      where: { id: string }; data: { name: string | null; language: "en" | "ar" }
    }) => {
      const user = users.get(where.id);
      if (!user) throw new Error("User missing");
      const updated = { ...user, ...data, updatedAt: new Date() };
      users.set(where.id, updated);
      return updated;
    })),
    findUnique: jest.fn(asAsync( ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) {
        return Array.from(users.values()).find((user) => user.id === where.id) ?? null;
      }

      if (where.email) {
        return Array.from(users.values()).find((user) => user.email === where.email) ?? null;
      }

      return null;
    })),
    create: jest.fn(asAsync( ({ data }: { data: { email: string; passwordHash: string; name: string | null; language: "en" | "ar" } }) => {
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
    }))
  },
  refreshToken: {
    create: jest.fn(asAsync( ({ data }: { data: { token: string; userId: string; expiresAt: Date } }) => {
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
    })),
    findUnique: jest.fn(asAsync( ({ where }: { where: { token: string } }) => {
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
    })),
    deleteMany: jest.fn(asAsync( ({ where }: { where: { token?: string; userId?: string } }) => {
      let count = 0;

      Array.from(refreshTokens.entries()).forEach(([token, record]) => {
        if ((where.token && token === where.token) || (where.userId && record.userId === where.userId)) {
          refreshTokens.delete(token);
          count += 1;
        }
      });

      return { count };
    })),
    delete: jest.fn(asAsync( ({ where }: { where: { token: string } }) => {
      const record = refreshTokens.get(where.token);

      if (!record) {
        throw new Error("Token missing");
      }

      refreshTokens.delete(where.token);
      return record;
    }))
  },
  $transaction: jest.fn(asAsync( (operations: Promise<unknown>[]) => Promise.all(operations))),
  $connect: jest.fn(asAsync( () => undefined)),
  $disconnect: jest.fn(asAsync( () => undefined))
};

const redisMock = {
  status: "ready",
  on: jest.fn(),
  connect: jest.fn(asAsync( () => undefined)),
  quit: jest.fn(asAsync( () => undefined)),
  set: jest.fn(asAsync( (key: string, value: string) => {
    refreshSessions.set(key, value);
    return "OK";
  })),
  get: jest.fn(asAsync( (key: string) => refreshSessions.get(key) ?? null)),
  del: jest.fn(asAsync( (key: string) => {
    refreshSessions.delete(key);
    return 1;
  }))
};

unstableMockModule("../../src/config/database.js", () => ({
  prisma: prismaMock
}));

unstableMockModule("../../src/config/redis.js", () => ({
  redis: redisMock,
  connectRedis: jest.fn(asAsync( () => undefined))
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
    const rawSetCookieHeader: unknown = healthResponse.headers["set-cookie"];
    const setCookieHeader = Array.isArray(rawSetCookieHeader)
      ? rawSetCookieHeader.filter((value): value is string => typeof value === "string")
      : typeof rawSetCookieHeader === "string" ? [rawSetCookieHeader] : [];
    const csrfCookie = setCookieHeader.find((cookie) => cookie?.startsWith("promptforge_csrf="));
    const csrfToken = csrfCookie?.split(";")[0]?.split("=")[1];

    expect(csrfToken).toBeDefined();

    const registerResponse = await agent
      .post("/api/auth/register")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("x-csrf-token", csrfToken!)
      .send({
        email: "user@example.com",
        password: "super-secret-password",
        name: "Prompt User",
        language: "en"
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).not.toHaveProperty("data.user.passwordHash");
    expect(registerResponse.body).toHaveProperty("data.user.email", "user@example.com");

    const loginResponse = await agent
      .post("/api/auth/login")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("x-csrf-token", csrfToken!)
      .send({
        email: "user@example.com",
        password: "super-secret-password"
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).not.toHaveProperty("data.user.passwordHash");
    expect(loginResponse.body).toHaveProperty("data.user.email", "user@example.com");

    const currentUserResponse = await agent.get("/api/auth/me");
    expect(currentUserResponse.status).toBe(200);
    expect(currentUserResponse.body).not.toHaveProperty("data.user.passwordHash");
    expect(currentUserResponse.body).toHaveProperty("data.user.id", "user-1");

    const profileResponse = await agent.put("/api/user/profile")
      .set("x-csrf-token", csrfToken!)
      .send({ name: "Updated User", language: "ar" });
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body).not.toHaveProperty("data.user.passwordHash");
    expect(profileResponse.body).toHaveProperty("data.user.name", "Updated User");
    expect(profileResponse.body).toHaveProperty("data.user.language", "ar");

    const refreshResponse = await agent
      .post("/api/auth/refresh")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("x-csrf-token", csrfToken!)
      .send({});

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body).not.toHaveProperty("data.user.passwordHash");
    expect(refreshResponse.body).toHaveProperty("data.user.id", "user-1");

    const logoutResponse = await agent
      .post("/api/auth/logout")
      .set("Content-Type", "application/json; charset=utf-8")
      .set("x-csrf-token", csrfToken!)
      .send({});

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body).toHaveProperty("data.message", expect.stringMatching(/Logged out/i));
  }, 20000);
});
