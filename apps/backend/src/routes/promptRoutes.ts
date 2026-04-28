import { Router } from "express";
import { z } from "zod";

import { listHistory } from "../controllers/historyController.js";
import {
  deletePrompt,
  generatePrompt,
  getPromptById,
  listPublicPrompts,
  regeneratePrompt,
  toggleFavorite
} from "../controllers/promptController.js";
import { requireAuth } from "../middleware/auth.js";
import { promptQuotaGuard } from "../middleware/rateLimit.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";

const promptRouter = Router();

const generateSchema = z.object({
  rawInput: z.string().min(3).max(2000),
  promptType: z
    .enum([
      "CREATIVE_WRITING",
      "CODE_GENERATION",
      "DATA_ANALYSIS",
      "IMAGE_GENERATION",
      "TRANSLATION",
      "SUMMARIZATION",
      "QA",
      "ROLEPLAY",
      "RESEARCH",
      "BUSINESS",
      "GENERAL"
    ])
    .optional(),
  tone: z.string().min(2).max(100).optional(),
  targetAI: z
    .enum([
      "GENERAL",
      "CHATGPT",
      "CLAUDE",
      "GEMINI",
      "MIDJOURNEY",
      "STABLE_DIFFUSION",
      "DALL_E",
      "COPILOT"
    ])
    .optional(),
  includeExamples: z.boolean().optional(),
  includeChainOfThought: z.boolean().optional()
});

const historyQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  promptType: z.string().optional(),
  language: z.enum(["en", "ar"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  favorited: z.enum(["true", "false"]).optional(),
  sortBy: z.enum(["newest", "oldest", "most_tokens"]).optional()
});

const promptIdSchema = z.object({
  id: z.string().min(1)
});

/**
 * @openapi
 * /prompts/generate:
 *   post:
 *     summary: Generate a professional prompt
 *     description: Expands a raw user idea into an optimized prompt using PromptForge's builder and Mistral Large.
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rawInput]
 *             properties:
 *               rawInput: { type: string }
 *               promptType: { type: string }
 *               tone: { type: string }
 *               targetAI: { type: string }
 *               includeExamples: { type: boolean }
 *               includeChainOfThought: { type: boolean }
 *     responses:
 *       201: { description: Prompt generated and stored }
 *       401: { description: Unauthorized }
 *       429: { description: Daily prompt quota exceeded }
 *       500: { description: Internal server error }
 */
promptRouter.post("/generate", requireAuth, promptQuotaGuard, validateBody(generateSchema), generatePrompt);

/**
 * @openapi
 * /prompts/history:
 *   get:
 *     summary: Get prompt history
 *     description: Returns paginated prompt history with filters for type, language, favorite state, and date range.
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Prompt history returned }
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
promptRouter.get("/history", requireAuth, validateQuery(historyQuerySchema), listHistory);

/**
 * @openapi
 * /prompts/public:
 *   get:
 *     summary: Browse public prompts
 *     description: Returns paginated public community prompts.
 *     tags: [Prompts]
 *     responses:
 *       200: { description: Public prompts returned }
 *       500: { description: Internal server error }
 */
promptRouter.get("/public", listPublicPrompts);

/**
 * @openapi
 * /prompts/{id}/regenerate:
 *   post:
 *     summary: Regenerate a stored prompt with the latest standard
 *     description: Rebuilds a stored prompt from its original raw input and updates the same history record in place.
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Prompt regenerated and updated }
 *       401: { description: Unauthorized }
 *       404: { description: Prompt not found }
 *       429: { description: Daily prompt quota exceeded }
 *       500: { description: Internal server error }
 */
promptRouter.post(
  "/:id/regenerate",
  requireAuth,
  promptQuotaGuard,
  validateParams(promptIdSchema),
  regeneratePrompt
);

/**
 * @openapi
 * /prompts/{id}:
 *   get:
 *     summary: Get a single prompt
 *     description: Returns a single stored prompt if it belongs to the user or is public.
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Prompt returned }
 *       403: { description: Forbidden }
 *       404: { description: Prompt not found }
 *       500: { description: Internal server error }
 */
promptRouter.get("/:id", requireAuth, validateParams(promptIdSchema), getPromptById);

/**
 * @openapi
 * /prompts/{id}/favorite:
 *   patch:
 *     summary: Toggle prompt favorite status
 *     description: Flips the favorite flag for the authenticated user's prompt.
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Favorite status updated }
 *       401: { description: Unauthorized }
 *       404: { description: Prompt not found }
 *       500: { description: Internal server error }
 */
promptRouter.patch("/:id/favorite", requireAuth, validateParams(promptIdSchema), toggleFavorite);

/**
 * @openapi
 * /prompts/{id}:
 *   delete:
 *     summary: Delete a prompt
 *     description: Deletes a prompt owned by the authenticated user.
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Prompt deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Prompt not found }
 *       500: { description: Internal server error }
 */
promptRouter.delete("/:id", requireAuth, validateParams(promptIdSchema), deletePrompt);

export default promptRouter;
