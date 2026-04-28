import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PromptInput } from "./PromptInput";

describe("PromptInput", () => {
  it("shows character counter, language indicator, and submits on Ctrl+Enter", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const onClear = vi.fn();
    const onFieldChange = vi.fn();

    render(
      <PromptInput
        form={{
          rawInput: "مرحبا",
          targetAI: "GENERAL",
          promptType: "GENERAL",
          tone: "Professional",
          includeExamples: false,
          includeChainOfThought: false
        }}
        detectedLanguage="ar"
        loading={false}
        onFieldChange={onFieldChange}
        onGenerate={onGenerate}
        onClear={onClear}
      />
    );

    expect(screen.getByText("🇦🇪")).toBeInTheDocument();
    expect(screen.getByText(/Characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto mode/i)).toBeInTheDocument();

    await user.click(screen.getByPlaceholderText(/Describe the task/i));
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("shows manual override chips when settings move off auto defaults", () => {
    render(
      <PromptInput
        form={{
          rawInput: "React accessibility",
          targetAI: "COPILOT",
          promptType: "CODE_GENERATION",
          tone: "Technical",
          includeExamples: true,
          includeChainOfThought: true
        }}
        detectedLanguage="en"
        loading={false}
        onFieldChange={vi.fn()}
        onGenerate={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Manual overrides/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Target AI: Copilot/i)).toBeInTheDocument();
    expect(screen.getByText(/Prompt type: Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Tone: Technical/i)).toBeInTheDocument();
    expect(screen.getByText(/Examples enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/Execution rigor enabled/i)).toBeInTheDocument();
  });
});
