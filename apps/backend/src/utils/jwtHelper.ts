import { randomUUID } from "node:crypto";

import type { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import type { AuthTokens, AuthenticatedUser } from "../types/index.js";

interface AccessTokenPayload {
  sub: string;
  email: string;
  plan: AuthenticatedUser["plan"];
  language: AuthenticatedUser["language"];
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
  ...(env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== "localhost"
    ? { domain: env.COOKIE_DOMAIN }
    : {})
});

const accessExpiresIn = env.JWT_EXPIRES_IN as NonNullable<jwt.SignOptions["expiresIn"]>;
const refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN as NonNullable<
  jwt.SignOptions["expiresIn"]
>;

const signToken = (
  payload: object,
  secret: string,
  expiresIn: NonNullable<jwt.SignOptions["expiresIn"]>
): string =>
  jwt.sign(payload, secret as jwt.Secret, {
    expiresIn
  });

export const signAccessToken = (user: AuthenticatedUser): string =>
  signToken(
    {
      sub: user.userId,
      email: user.email,
      plan: user.plan,
      language: user.language
    } satisfies AccessTokenPayload,
    env.JWT_SECRET,
    accessExpiresIn
  );

export const signRefreshToken = (user: AuthenticatedUser): string =>
  signToken(
    {
      sub: user.userId,
      jti: randomUUID()
    } satisfies RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    refreshExpiresIn
  );

export const issueAuthTokens = (user: AuthenticatedUser): AuthTokens => ({
  accessToken: signAccessToken(user),
  refreshToken: signRefreshToken(user)
});

export const verifyAccessToken = (token: string): AccessTokenPayload & jwt.JwtPayload =>
  jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload & jwt.JwtPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload & jwt.JwtPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload & jwt.JwtPayload;

export const setAuthCookies = (
  response: Response,
  tokens: AuthTokens
): void => {
  response.cookie(env.ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...baseCookieOptions(),
    maxAge: 15 * 60 * 1000
  });

  response.cookie(env.REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...baseCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

export const clearAuthCookies = (response: Response): void => {
  response.clearCookie(env.ACCESS_COOKIE_NAME, baseCookieOptions());
  response.clearCookie(env.REFRESH_COOKIE_NAME, baseCookieOptions());
};
