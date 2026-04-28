import { create } from "zustand";

import type { GeneratedPrompt, PromptGenerateInput } from "../types";
import { createInitialPromptForm } from "../utils/promptForm";

const DRAFT_STORAGE_KEY = "promptforge-draft";

interface PromptState {
  form: PromptGenerateInput;
  result: GeneratedPrompt | null;
  promptId: string | null;
  setField: <K extends keyof PromptGenerateInput>(field: K, value: PromptGenerateInput[K]) => void;
  setResult: (result: GeneratedPrompt | null, promptId?: string | null) => void;
  clearInput: () => void;
  loadDraft: () => void;
  persistDraft: () => void;
}

const initialForm: PromptGenerateInput = createInitialPromptForm();

export const usePromptStore = create<PromptState>((set, get) => ({
  form: initialForm,
  result: null,
  promptId: null,
  setField: (field, value) =>
    set((state) => ({
      form: {
        ...state.form,
        [field]: value
      }
    })),
  setResult: (result, promptId = null) =>
    set({
      result,
      promptId
    }),
  clearInput: () =>
    set({
      form: createInitialPromptForm()
    }),
  loadDraft: () => {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PromptGenerateInput;
      set({ form: { ...createInitialPromptForm(), ...parsed } });
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  },
  persistDraft: () => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(get().form));
    } catch {
      // Ignore storage quota failures and keep the in-memory draft intact.
    }
  }
}));
