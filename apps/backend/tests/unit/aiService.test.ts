import { jest } from "@jest/globals";
import type OpenAI from "openai";

import { AIService } from "../../src/services/aiService.js";
import { promptBuilder } from "../../src/services/promptBuilder.js";

describe("aiService", () => {
  const getWordCount = (text: string): number =>
    text.trim().split(/\s+/u).filter(Boolean).length;

  const getEstimatedTokens = (text: string): number =>
    Math.ceil(text.length / 4);

  it("returns the deterministic builder draft immediately for structured build prompts", async () => {
    const builtPrompt = promptBuilder.build({
      rawInput: "build an application for kids to teach words"
    });

    const create = jest.fn<() => Promise<unknown>>();

    const service = new AIService({
      chat: {
        completions: {
          create
        }
      }
    } as unknown as OpenAI);

    const result = await service.generatePrompt(
      "build an application for kids to teach words",
      builtPrompt
    );

    expect(create).not.toHaveBeenCalled();
    expect(result.generatedPrompt).toBe(builtPrompt.generatedPrompt);
    expect(result.source).toBe("builder");
    expect(result.cacheStatus).toBe("skip");
  });

  it("returns the deterministic builder draft immediately for image prompts", async () => {
    const builtPrompt = promptBuilder.build({
      rawInput: "create a cinematic poster prompt for a robotics conference in Dubai",
      targetAI: "MIDJOURNEY"
    });

    const create = jest.fn<() => Promise<unknown>>();

    const service = new AIService({
      chat: {
        completions: {
          create
        }
      }
    } as unknown as OpenAI);

    const result = await service.generatePrompt(
      "create a cinematic poster prompt for a robotics conference in Dubai",
      builtPrompt
    );

    expect(create).not.toHaveBeenCalled();
    expect(result.generatedPrompt).toBe(builtPrompt.generatedPrompt);
    expect(result.source).toBe("builder");
    expect(result.cacheStatus).toBe("skip");
  });

  it("retries transient Mistral failures and succeeds on the third attempt", async () => {
    const basePrompt = promptBuilder.build({
      rawInput: "write a creative story prompt about coffee and memory"
    });
    const generatedPrompt = [
      "[ROLE]",
      "You are a senior creative writing prompt designer who specializes in cinematic, emotionally resonant storytelling prompts for advanced language models and screenwriting systems.",
      "",
      "[TASK]",
      "Produce a cinematic prompt about coffee and memory with a clear emotional arc, sensory imagery, visual motifs, character tension, setting detail, and a professional creative brief structure that another model can execute immediately."
    ].join("\n");
    const builtPrompt = {
      ...basePrompt,
      generatedPrompt,
      sections: {
        ...basePrompt.sections,
        validationChecklist: "",
        assumptionPolicy: ""
      },
      wordCount: getWordCount(generatedPrompt),
      estimatedTokens: getEstimatedTokens(generatedPrompt)
    };

    const create = jest.fn<() => Promise<unknown>>();

    create
      .mockImplementationOnce(() =>
        Promise.reject(Object.assign(new Error("rate limited"), { status: 429 }))
      )
      .mockImplementationOnce(() =>
        Promise.reject(Object.assign(new Error("temporary issue"), { status: 503 }))
      )
      .mockImplementation(() => Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify({
                generatedPrompt: builtPrompt.generatedPrompt
              })
            }
          }
        ],
        usage: {
          prompt_tokens: 60,
          completion_tokens: 120
        }
      }));

    const service = new AIService({
      chat: {
        completions: {
          create
        }
      }
    } as unknown as OpenAI);

    const result = await service.generatePrompt(
      "write a creative story prompt about coffee and memory",
      builtPrompt
    );

    expect(create).toHaveBeenCalledTimes(4);
    expect(result.generatedPrompt).toBe(builtPrompt.generatedPrompt);
    expect(result.wordCount).toBe(builtPrompt.wordCount);
    expect(result.estimatedTokens).toBe(360);

    const calls = create.mock.calls as unknown as [{
      max_tokens?: number;
      messages?: {
        role?: string;
        content?: string;
      }[];
    }][];
    const generationCall = calls[2]?.[0];
    const repairCall = calls[3]?.[0];
    const systemMessage = generationCall?.messages?.[0];
    const userMessage = generationCall?.messages?.[1];
    const userPayload: unknown = userMessage?.content ? JSON.parse(userMessage.content) : null;

    expect(systemMessage?.role).toBe("system");
    expect(systemMessage?.content).toContain("Use the raw input, the compact analysis, and the draft as scaffolding");
    expect(systemMessage?.content).toContain("model-agnostic core");
    expect(systemMessage?.content).toContain("validation checklist and assumption policy");
    expect(systemMessage?.content).toContain("response-budget guidance");
    expect(systemMessage?.content).toContain("Do not add prompt-engineering commentary");
    expect(systemMessage?.content).toContain("Broad product or workflow ideas should become detailed multi-section execution prompts");
    expect(systemMessage?.content).toContain("Keep section headings stable and professional");
    expect(systemMessage?.content).toContain("RESPONSE BUDGET");
    expect(generationCall?.max_tokens).toBeGreaterThanOrEqual(420);
    expect(generationCall?.max_tokens).toBeLessThanOrEqual(900);
    expect(userPayload).toMatchObject({
      rawInput: "write a creative story prompt about coffee and memory",
      promptDraft: builtPrompt.generatedPrompt,
      analysis: {
        promptType: builtPrompt.promptType,
        domain: builtPrompt.domain,
        language: builtPrompt.detectedLanguage
      }
    });
    expect(userPayload).not.toHaveProperty("builderAnalysis");
    expect(userPayload).not.toHaveProperty("analysis.tags");
    expect(repairCall?.messages?.[0]?.content).toContain("repair prompt drafts");
  });

  it("repairs weak model output before returning it", async () => {
    const basePrompt = promptBuilder.build({
      rawInput: "write a creative story prompt about a lonely robot"
    });
    const generatedPrompt = [
      "[ROLE]",
      "You are a senior creative writing prompt designer who specializes in cinematic, emotionally resonant storytelling prompts for advanced language models and screenwriting systems.",
      "",
      "[TASK]",
      "Create a richer short-film prompt about a lonely robot with a clear emotional arc, visual motifs, scene direction, tone guidance, thematic tension, and enough structure for another model to execute immediately without clarification."
    ].join("\n");
    const builtPrompt = {
      ...basePrompt,
      generatedPrompt,
      sections: {
        ...basePrompt.sections,
        validationChecklist: "",
        assumptionPolicy: ""
      },
      wordCount: getWordCount(generatedPrompt),
      estimatedTokens: getEstimatedTokens(generatedPrompt)
    };

    const create = jest.fn<() => Promise<unknown>>();

    create
      .mockImplementationOnce(() => Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify({
                generatedPrompt: "[ROLE]\nWeak draft without the required sections."
              })
            }
          }
        ],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 80
        }
      }))
      .mockImplementationOnce(() => Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify({
                generatedPrompt: builtPrompt.generatedPrompt
              })
            }
          }
        ],
        usage: {
          prompt_tokens: 90,
          completion_tokens: 130
        }
      }));

    const service = new AIService({
      chat: {
        completions: {
          create
        }
      }
    } as unknown as OpenAI);

    const result = await service.generatePrompt(
      "write a creative story prompt about a lonely robot",
      builtPrompt
    );

    expect(create).toHaveBeenCalledTimes(2);
    expect(result.generatedPrompt).toBe(builtPrompt.generatedPrompt);

    const repairCall = (create.mock.calls as unknown as [{
      messages?: {
        role?: string;
        content?: string;
      }[];
    }][]).at(1)?.[0];
    const repairSystemMessage = repairCall?.messages?.[0];
    const repairUserPayload: unknown = repairCall?.messages?.[1]?.content
      ? JSON.parse(repairCall.messages[1].content)
      : null;

    expect(repairSystemMessage?.content).toContain("You repair prompt drafts that failed a quality gate");
    expect(repairUserPayload).toMatchObject({
      rawInput: "write a creative story prompt about a lonely robot",
      candidatePrompt: "[ROLE]\nWeak draft without the required sections."
    });
    expect(repairUserPayload).toHaveProperty("issues.0.code", expect.any(String));
    expect(repairUserPayload).toHaveProperty("requiredMarkers", expect.arrayContaining(["[TASK]"]));
  });
});
