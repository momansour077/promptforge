import { useEffect, useState } from "react";

import DOMPurify from "dompurify";
import { toast } from "sonner";

import { promptService } from "../services/promptService";
import { usePromptStore } from "../store/promptStore";
import type { ApiError, PromptGenerateRequest } from "../types";
import { copyToClipboard } from "../utils/clipboard";
import { detectLanguage } from "../utils/langDetect";
import {
  DEFAULT_PROMPT_TYPE,
  DEFAULT_TARGET_AI,
  DEFAULT_TONE
} from "../utils/promptForm";

export const usePromptGeneration = () => {
  const form = usePromptStore((state) => state.form);
  const result = usePromptStore((state) => state.result);
  const promptId = usePromptStore((state) => state.promptId);
  const setField = usePromptStore((state) => state.setField);
  const setResult = usePromptStore((state) => state.setResult);
  const clearInput = usePromptStore((state) => state.clearInput);
  const loadDraft = usePromptStore((state) => state.loadDraft);
  const persistDraft = usePromptStore((state) => state.persistDraft);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      persistDraft();
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [form, persistDraft]);

  const generate = async () => {
    setLoading(true);
    setError(null);

    try {
      const sanitizedInput = DOMPurify.sanitize(form.rawInput, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });

      const payload: PromptGenerateRequest = {
        rawInput: sanitizedInput
      };

      if (form.targetAI !== DEFAULT_TARGET_AI) {
        payload.targetAI = form.targetAI;
      }

      if (form.promptType !== DEFAULT_PROMPT_TYPE) {
        payload.promptType = form.promptType;
      }

      if (form.tone !== DEFAULT_TONE) {
        payload.tone = form.tone;
      }

      if (form.includeExamples) {
        payload.includeExamples = true;
      }

      if (form.includeChainOfThought) {
        payload.includeChainOfThought = true;
      }

      const data = await promptService.generate(payload);
      setResult(data.generated, data.prompt.id);
      toast.success("Prompt generated successfully.");
      return data.generated;
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError);
      toast.error(apiError.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => generate();

  const copyOutput = async () => {
    if (!result) {
      return;
    }

    await copyToClipboard(result.generatedPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return {
    form,
    result,
    promptId,
    loading,
    error,
    copied,
    detectedLanguage: detectLanguage(form.rawInput),
    setField,
    clearInput,
    generate,
    regenerate,
    copyOutput
  };
};
