import { detectLanguage } from "./langDetect";

describe("detectLanguage", () => {
  it("detects English text", () => {
    expect(detectLanguage("Build a launch campaign for a SaaS product")).toBe("en");
  });

  it("detects Arabic text", () => {
    expect(detectLanguage("اكتب وصفاً احترافياً لمنصة تعليمية")).toBe("ar");
  });
});

