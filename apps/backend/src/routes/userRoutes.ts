import { Router } from "express";
import { z } from "zod";

import {
  changePassword,
  getQuota,
  getStats,
  updateProfile
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const userRouter = Router();

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  language: z.enum(["en", "ar"])
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128)
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match."
      });
    }
  });

/**
 * @openapi
 * /user/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Returns prompt totals, token usage, favorites, and the last 30 days of usage.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Usage stats returned }
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
userRouter.get("/stats", requireAuth, getStats);

/**
 * @openapi
 * /user/profile:
 *   put:
 *     summary: Update the current profile
 *     description: Updates display name and preferred UI language.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Profile updated }
 *       401: { description: Unauthorized }
 *       422: { description: Validation failed }
 *       500: { description: Internal server error }
 */
userRouter.put("/profile", requireAuth, validateBody(profileSchema), updateProfile);

/**
 * @openapi
 * /user/password:
 *   put:
 *     summary: Change account password
 *     description: Verifies the current password, updates it, and invalidates refresh sessions.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Password updated }
 *       401: { description: Unauthorized or invalid credentials }
 *       422: { description: Validation failed }
 *       500: { description: Internal server error }
 */
userRouter.put("/password", requireAuth, validateBody(passwordSchema), changePassword);

/**
 * @openapi
 * /user/quota:
 *   get:
 *     summary: Get current daily quota
 *     description: Returns the current daily usage, remaining quota, and reset timestamp.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Quota returned }
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
userRouter.get("/quota", requireAuth, getQuota);

export default userRouter;
