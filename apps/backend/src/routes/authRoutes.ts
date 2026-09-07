import { Router } from "express";
import { z } from "zod";

import { login, logout, me, refresh, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
  language: z.enum(["en", "ar"]).default("en")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a PromptForge account, hashes the password, and sets secure auth cookies.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, language]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *               language: { type: string, enum: [en, ar] }
 *     responses:
 *       201: { description: User registered successfully }
 *       400: { description: Invalid request }
 *       409: { description: Email already in use }
 *       422: { description: Validation failed }
 *       500: { description: Internal server error }
 */
authRouter.post("/register", validateBody(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Sign in an existing user
 *     description: Verifies user credentials and sets secure access and refresh cookies.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 *       422: { description: Validation failed }
 *       500: { description: Internal server error }
 */
authRouter.post("/login", validateBody(loginSchema), login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh the current session
 *     description: Rotates the refresh token and issues a new access token.
 *     tags: [Auth]
 *     responses:
 *       200: { description: Session refreshed }
 *       401: { description: Invalid refresh token }
 *       500: { description: Internal server error }
 */
authRouter.post("/refresh", refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Sign out the current user
 *     description: Invalidates the refresh token and clears auth cookies.
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logout successful }
 *       500: { description: Internal server error }
 */
authRouter.post("/logout", logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Authenticated user returned }
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
authRouter.get("/me", requireAuth, me);

export default authRouter;
