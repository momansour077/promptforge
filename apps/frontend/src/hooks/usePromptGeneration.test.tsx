import { act, renderHook, waitFor } from "@testing-library/react";

import { promptService } from "../services/promptService";
import { usePromptStore } from "../store/promptStore";
import { usePromptGeneration } from "./usePromptGeneration";

vi.mock("../services/promptService", () => ({
  promptService: {
    generate: vi.fn()
  }
}));

describe("usePromptGeneration", () => {
  beforeEach(() => {
    usePromptStore.setState({
      form: {
        rawInput: "",
        targetAI: "GENERAL",
        promptType: "GENERAL",
        tone: "Professional",
        includeExamples: false,
        includeChainOfThought: false
      },
      result: null,
      promptId: null
    });
    vi.clearAllMocks();
  });

  it("transitions through loading and success states", async () => {
    vi.mocked(promptService.generate).mockResolvedValue({
      prompt: {
        id: "prompt-1",
        userId: "user-1",
        rawInput: "Create a launch prompt",
        detectedLang: "en",
        outputPrompt: "output",
        promptType: "GENERAL",
        targetAI: "GENERAL",
        tone: "Professional",
        domain: "general",
        tokensUsed: 100,
        isFavorited: false,
        isPublic: false,
        collectionId: null,
        createdAt: new Date().toISOString(),
        tags: []
      },
      generated: {
        generatedPrompt: "output",
        framework: "RTF",
        promptType: "GENERAL",
        targetAI: "GENERAL",
        tone: "Professional",
        domain: "general",
        tags: ["general"],
        wordCount: 10,
        estimatedTokens: 100,
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

    const { result } = renderHook(() => usePromptGeneration());

    act(() => {
      result.current.setField("rawInput", "Create a launch prompt");
    });

    let promise: Promise<unknown>;

    act(() => {
      promise = result.current.generate();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await promise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.result?.generatedPrompt).toBe("output");
    });

    expect(promptService.generate).toHaveBeenCalledWith({
      rawInput: "Create a launch prompt"
    });
  });

  it("captures API errors", async () => {
    vi.mocked(promptService.generate).mockRejectedValue({
      code: "REQUEST_FAILED",
      message: "Generation failed"
    });

    const { result } = renderHook(() => usePromptGeneration());

    act(() => {
      result.current.setField("rawInput", "Create a launch prompt");
    });

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.error?.message).toBe("Generation failed");
  });
});
