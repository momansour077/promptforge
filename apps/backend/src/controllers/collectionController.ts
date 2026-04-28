import type { Request, Response } from "express";

import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { sendSuccess } from "../utils/responseHelper.js";

export const listCollections = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const collections = await prisma.collection.findMany({
    where: {
      userId: request.authUser.userId
    },
    include: {
      _count: {
        select: {
          prompts: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return sendSuccess(response, { collections });
};

export const createCollection = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const collection = await prisma.collection.create({
    data: {
      userId: request.authUser.userId,
      name: request.body.name,
      description: request.body.description,
      isPublic: request.body.isPublic ?? false
    }
  });

  return sendSuccess(response, { collection }, 201);
};

export const getCollection = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const collectionId = String(request.params.id);
  const collection = await prisma.collection.findFirst({
    where: {
      id: collectionId,
      userId: request.authUser.userId
    },
    include: {
      prompts: {
        include: {
          tags: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!collection) {
    throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
  }

  return sendSuccess(response, { collection });
};

export const updateCollection = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const collectionId = String(request.params.id);
  const collection = await prisma.collection.updateMany({
    where: {
      id: collectionId,
      userId: request.authUser.userId
    },
    data: {
      name: request.body.name,
      description: request.body.description,
      isPublic: request.body.isPublic
    }
  });

  if (collection.count === 0) {
    throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
  }

  const updated = await prisma.collection.findUnique({
    where: {
      id: collectionId
    }
  });

  return sendSuccess(response, { collection: updated });
};

export const deleteCollection = async (request: Request, response: Response): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const collectionId = String(request.params.id);
  const deleted = await prisma.collection.deleteMany({
    where: {
      id: collectionId,
      userId: request.authUser.userId
    }
  });

  if (deleted.count === 0) {
    throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
  }

  return sendSuccess(response, { message: "Collection deleted successfully." });
};

export const addPromptToCollection = async (
  request: Request,
  response: Response
): Promise<Response> => {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const collectionId = String(request.params.id);
  const collection = await prisma.collection.findFirst({
    where: {
      id: collectionId,
      userId: request.authUser.userId
    }
  });

  if (!collection) {
    throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
  }

  const prompt = await prisma.prompt.updateMany({
    where: {
      id: request.body.promptId,
      userId: request.authUser.userId
    },
    data: {
      collectionId: collection.id
    }
  });

  if (prompt.count === 0) {
    throw new AppError(404, "PROMPT_NOT_FOUND", "Prompt not found.");
  }

  const updatedPrompt = await prisma.prompt.findUnique({
    where: {
      id: request.body.promptId
    }
  });

  return sendSuccess(response, { prompt: updatedPrompt });
};
