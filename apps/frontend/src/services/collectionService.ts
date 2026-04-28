import api from "./api";

import type { ApiResponse, Collection, PromptRecord } from "../types";

export const collectionService = {
  list: async (): Promise<Collection[]> => {
    const response = await api.get<ApiResponse<{ collections: Collection[] }>>("/collections");
    return response.data.data.collections;
  },
  create: async (payload: {
    name: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<Collection> => {
    const response = await api.post<ApiResponse<{ collection: Collection }>>("/collections", payload);
    return response.data.data.collection;
  },
  update: async (
    id: string,
    payload: { name: string; description?: string; isPublic?: boolean }
  ): Promise<Collection> => {
    const response = await api.put<ApiResponse<{ collection: Collection }>>(`/collections/${id}`, payload);
    return response.data.data.collection;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/collections/${id}`);
  },
  getById: async (id: string): Promise<Collection> => {
    const response = await api.get<ApiResponse<{ collection: Collection }>>(`/collections/${id}`);
    return response.data.data.collection;
  },
  addPrompt: async (collectionId: string, promptId: string): Promise<PromptRecord> => {
    const response = await api.post<ApiResponse<{ prompt: PromptRecord }>>(
      `/collections/${collectionId}/prompts`,
      { promptId }
    );
    return response.data.data.prompt;
  }
};

