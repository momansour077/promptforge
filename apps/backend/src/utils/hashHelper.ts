import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

const PASSWORD_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, PASSWORD_ROUNDS);

export const comparePassword = async (
  password: string,
  passwordHash: string
): Promise<boolean> => bcrypt.compare(password, passwordHash);

export const hashToken = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const generateOpaqueId = (): string => randomBytes(32).toString("hex");

