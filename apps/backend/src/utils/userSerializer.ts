interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  language: string;
  plan: string;
  promptsToday: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Explicit allowlist: ORM records can contain password hashes and future secrets. */
export const serializeUser = (user: UserRecord) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  language: user.language,
  plan: user.plan,
  promptsToday: user.promptsToday,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString()
});
