import api from "./api";

import type {
  ApiResponse,
  GeneratedPrompt,
  HistoryPayload,
  PromptGenerateRequest,
  PromptGeneratePayload,
  PromptRecord
} from "../types";

export const promptService = {
  generate: async (payload: PromptGenerateRequest): Promise<PromptGeneratePayload> => {
    const response = await api.post<ApiResponse<PromptGeneratePayload>>("/prompts/generate", payload);
    return response.data.data;
  },
  regenerate: async (id: string): Promise<PromptGeneratePayload> => {
    const response = await api.post<ApiResponse<PromptGeneratePayload>>(`/prompts/${id}/regenerate`);
    return response.data.data;
  },
  history: async (query: Record<string, string | undefined>): Promise<ApiResponse<HistoryPayload>> => {
    const response = await api.get<ApiResponse<HistoryPayload>>("/prompts/history", {
      params: query
    });
    return response.data;
  },
  getById: async (id: string): Promise<PromptRecord> => {
    const response = await api.get<ApiResponse<{ prompt: PromptRecord }>>(`/prompts/${id}`);
    return response.data.data.prompt;
  },
  toggleFavorite: async (id: string): Promise<PromptRecord> => {
    const response = await api.patch<ApiResponse<{ prompt: PromptRecord }>>(`/prompts/${id}/favorite`);
    return response.data.data.prompt;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/prompts/${id}`);
  },
  listPublic: async (): Promise<PromptRecord[]> => {
    const response = await api.get<ApiResponse<HistoryPayload>>("/prompts/public");
    return response.data.data.items;
  },
  downloadPrompt: (generatedPrompt: GeneratedPrompt): void => {
    const blob = new Blob([generatedPrompt.generatedPrompt], { type: "text/plain;charset=utf-8" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "promptforge-prompt.txt";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }
};
