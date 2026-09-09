import { PrismaClient } from "@prisma/client";

declare global {

  var __promptforgePrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__promptforgePrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__promptforgePrisma__ = prisma;
}

