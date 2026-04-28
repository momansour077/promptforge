import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import App from "./App";

vi.mock("./services/authService", () => ({
  authService: {
    me: vi.fn().mockRejectedValue({
      code: "UNAUTHORIZED",
      message: "Authentication is required."
    }),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn()
  }
}));

vi.mock("./services/promptService", () => ({
  promptService: {
    listPublic: vi.fn().mockResolvedValue([]),
    generate: vi.fn(),
    regenerate: vi.fn(),
    history: vi.fn(),
    getById: vi.fn(),
    toggleFavorite: vi.fn(),
    remove: vi.fn(),
    downloadPrompt: vi.fn()
  }
}));

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("App", () => {
  it("renders the public home page shell", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("PromptForge")).toBeInTheDocument();
    });

    expect(screen.getByText("Sharper prompts for serious work.")).toBeInTheDocument();
  });
});
