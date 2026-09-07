import { Router } from "express";
import { z } from "zod";

import {
  addPromptToCollection,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  updateCollection
} from "../controllers/collectionController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";

const collectionRouter = Router();

const collectionSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(240).optional(),
  isPublic: z.boolean().optional()
});

const collectionParamsSchema = z.object({
  id: z.string().min(1)
});

const addPromptSchema = z.object({
  promptId: z.string().min(1)
});

export type CollectionBody = z.infer<typeof collectionSchema>;
export type AddPromptBody = z.infer<typeof addPromptSchema>;

/**
 * @openapi
 * /collections:
 *   get:
 *     summary: List collections
 *     description: Returns the authenticated user's prompt collections.
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Collections returned }
 *       401: { description: Unauthorized }
 */
collectionRouter.get("/", requireAuth, listCollections);

/**
 * @openapi
 * /collections:
 *   post:
 *     summary: Create a collection
 *     description: Creates a new collection for the authenticated user.
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Collection created }
 *       401: { description: Unauthorized }
 *       422: { description: Validation failed }
 *       500: { description: Internal server error }
 */
collectionRouter.post("/", requireAuth, validateBody(collectionSchema), createCollection);

/**
 * @openapi
 * /collections/{id}:
 *   get:
 *     summary: Get a collection with prompts
 *     description: Returns a collection and its prompts for the authenticated user.
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Collection returned }
 *       401: { description: Unauthorized }
 *       404: { description: Collection not found }
 *       500: { description: Internal server error }
 */
collectionRouter.get("/:id", requireAuth, validateParams(collectionParamsSchema), getCollection);

/**
 * @openapi
 * /collections/{id}:
 *   put:
 *     summary: Update a collection
 *     description: Updates collection metadata for the authenticated user.
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Collection updated }
 *       401: { description: Unauthorized }
 *       404: { description: Collection not found }
 *       500: { description: Internal server error }
 */
collectionRouter.put(
  "/:id",
  requireAuth,
  validateParams(collectionParamsSchema),
  validateBody(collectionSchema),
  updateCollection
);

/**
 * @openapi
 * /collections/{id}:
 *   delete:
 *     summary: Delete a collection
 *     description: Deletes a collection owned by the authenticated user.
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Collection deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Collection not found }
 *       500: { description: Internal server error }
 */
collectionRouter.delete("/:id", requireAuth, validateParams(collectionParamsSchema), deleteCollection);

/**
 * @openapi
 * /collections/{id}/prompts:
 *   post:
 *     summary: Add a prompt to a collection
 *     description: Assigns a stored prompt to the selected collection.
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Prompt added to collection }
 *       401: { description: Unauthorized }
 *       404: { description: Collection or prompt not found }
 *       500: { description: Internal server error }
 */
collectionRouter.post(
  "/:id/prompts",
  requireAuth,
  validateParams(collectionParamsSchema),
  validateBody(addPromptSchema),
  addPromptToCollection
);

export default collectionRouter;
