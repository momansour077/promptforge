import { serializeUser } from "../../src/utils/userSerializer.js";

describe("serializeUser", () => {
  it("allowlists public user fields even when the ORM record contains secrets", () => {
    const record = {
      id: "test-user", email: "user@example.com", name: null,
      language: "en", plan: "FREE", promptsToday: 0,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      passwordHash: "synthetic-test-only", futureSecret: "must-not-escape"
    };
    const result = serializeUser(record);
    expect(result).toEqual({
      id: "test-user", email: "user@example.com", name: null,
      language: "en", plan: "FREE", promptsToday: 0,
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z"
    });
    expect(record.passwordHash).toBe("synthetic-test-only");
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("futureSecret");
  });
});
