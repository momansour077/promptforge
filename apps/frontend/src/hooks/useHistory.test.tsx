import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { historyService } from "../services/historyService";
import { useHistory } from "./useHistory";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock("../services/historyService", () => ({
  historyService: {
    list: vi.fn(),
    regenerate: vi.fn(),
    toggleFavorite: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError
  }
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe("useHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(historyService.list).mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: "prompt-1",
            userId: "user-1",
            rawInput: "Write a blog post about coffee for startup founders",
            detectedLang: "en",
            outputPrompt: "legacy prompt",
            promptType: "CREATIVE_WRITING",
            targetAI: "GENERAL",
            tone: "Professional",
            domain: "marketing",
            tokensUsed: 120,
            isFavorited: false,
            isPublic: false,
            collectionId: null,
            createdAt: new Date().toISOString(),
            tags: []
          }
        ],
        total: 1
      }
    });
  });

  it("replaces the stored history item when regeneration succeeds", async () => {
    vi.mocked(historyService.regenerate).mockResolvedValue({
      prompt: {
        id: "prompt-1",
        userId: "user-1",
        rawInput: "Write a blog post about coffee for startup founders",
        detectedLang: "en",
        outputPrompt: "[ROLE]\nYou are a senior content strategist.",
        promptType: "CREATIVE_WRITING",
        targetAI: "GENERAL",
        tone: "professional, precise, and audience-aware",
        domain: "marketing",
        tokensUsed: 260,
        isFavorited: false,
        isPublic: false,
        collectionId: null,
        createdAt: new Date().toISOString(),
        tags: []
      },
      generated: {
        generatedPrompt: "[ROLE]\nYou are a senior content strategist.",
        framework: "TRACE",
        promptType: "CREATIVE_WRITING",
        targetAI: "GENERAL",
        tone: "professional, precise, and audience-aware",
        domain: "marketing",
        tags: ["marketing"],
        wordCount: 40,
        estimatedTokens: 260,
        rtlRequired: false,
        targetAISuggestion: "GENERAL",
        improvementTips: ["tip"],
        sections: {
          role: "role",
          objective: "objective",
          context: "context",
          task: "task",
          deliverable: "deliverable",
          outputFormat: "output",
          toneAndStyle: "tone",
          decisionRules: "rules",
          successCriteria: "success",
          constraints: "constraints",
          failureModes: "failures",
          examples: "examples",
          executionApproach: "execution"
        },
        detectedLanguage: "en",
        outputFormat: "structured"
      }
    });

    const { result } = renderHook(() => useHistory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items[0]?.outputPrompt).toBe("legacy prompt");

    await act(async () => {
      await result.current.regeneratePrompt("prompt-1");
    });

    expect(result.current.items[0]?.outputPrompt).toContain("[ROLE]");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.regeneratingId).toBeNull();
    expect(toastSuccess).toHaveBeenCalledWith("toast.promptRegenerated");
  });
});
