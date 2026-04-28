import fs from "node:fs";

import { expect, test } from "@playwright/test";

import { ensureSignedIn } from "./support/auth.js";

const OUTPUT_PATH = "/tmp/promptforge-ui-enhancement.json";

const scenarios = [
  {
    id: "en_short_product",
    input: "kids word app",
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Professional",
    expected: {
      language: "en",
      frameworkLabel: "Execution plan",
      promptTypeLabel: "Code",
      minOutputWords: 180,
      minExpansionRatio: 35,
      requiredTokens: [
        "[ROLE]",
        "[OBJECTIVE]",
        "[SUCCESS CRITERIA]",
        "[VALIDATION CHECKLIST]",
        "[ASSUMPTION POLICY]",
        "[VERIFICATION STEPS]",
        "[ACCEPTANCE TESTS]",
        "Product Goal",
        "Learning Experience",
        "Recommended Tech Stack"
      ],
      forbiddenTokens: ["build-ready prompt", "prompt-engineering commentary", "CHAIN OF THOUGHT"]
    }
  },
  {
    id: "ar_short_product",
    input: "تطبيق كلمات للأطفال",
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Professional",
    expected: {
      language: "ar",
      frameworkLabel: "خطة تنفيذ",
      promptTypeLabel: "برمجة",
      minOutputWords: 170,
      minExpansionRatio: 30,
      requiredTokens: [
        "[الدور]",
        "[الهدف]",
        "[معايير النجاح]",
        "[قائمة التحقق]",
        "[سياسة الافتراضات]",
        "[خطوات التحقق]",
        "[معايير القبول]",
        "الهدف من المنتج",
        "تجربة التعلّم",
        "التقنية المقترحة"
      ],
      forbiddenTokens: ["برومبت بناء", "تعليق على البرومبت", "سلسلة التفكير"]
    }
  },
  {
    id: "en_short_business",
    input: "SaaS pricing",
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Professional",
    expected: {
      language: "en",
      frameworkLabel: "Business brief",
      promptTypeLabel: "Business",
      minOutputWords: 140,
      minExpansionRatio: 28,
      requiredTokens: [
        "[ROLE]",
        "[OBJECTIVE]",
        "decision criteria",
        "business-ready brief",
        "[VALIDATION CHECKLIST]",
        "[ASSUMPTION POLICY]",
        "[FAILURE MODES TO AVOID]"
      ],
      forbiddenTokens: ["prompt-engineering commentary", "build-ready prompt", "CHAIN OF THOUGHT"]
    }
  },
  {
    id: "ar_short_business",
    input: "تسعير SaaS",
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Professional",
    expected: {
      language: "ar",
      frameworkLabel: "موجز أعمال",
      promptTypeLabel: "أعمال",
      minOutputWords: 130,
      minExpansionRatio: 24,
      requiredTokens: [
        "[الدور]",
        "[الهدف]",
        "معايير القرار",
        "موجزاً تجارياً",
        "[قائمة التحقق]",
        "[سياسة الافتراضات]",
        "[ما يجب تجنبه]"
      ],
      forbiddenTokens: ["تعليق على البرومبت", "برومبت بناء"]
    }
  },
  {
    id: "en_short_image",
    input: "robotics poster",
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Creative",
    expected: {
      language: "en",
      frameworkLabel: "Creative brief",
      promptTypeLabel: "Image",
      minOutputWords: 75,
      minExpansionRatio: 20,
      requiredTokens: [
        "[VISUAL PROMPT]",
        "[STYLE]",
        "[LIGHTING]",
        "[COMPOSITION]",
        "[NEGATIVE PROMPT]"
      ],
      forbiddenTokens: ["framework", "prompt-engineering commentary"]
    }
  },
  {
    id: "ar_short_image",
    input: "بوستر روبوتات",
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Creative",
    expected: {
      language: "ar",
      frameworkLabel: "موجز إبداعي",
      promptTypeLabel: "صور",
      minOutputWords: 70,
      minExpansionRatio: 18,
      requiredTokens: [
        "[البرومبت البصري]",
        "[الأسلوب]",
        "[الإضاءة]",
        "[التكوين]",
        "[العناصر المستبعدة]"
      ],
      forbiddenTokens: ["إطار", "تعليق على البرومبت"]
    }
  },
  {
    id: "en_short_code",
    input: "React accessibility",
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Technical",
    expected: {
      language: "en",
      frameworkLabel: "Execution plan",
      promptTypeLabel: "Code",
      minOutputWords: 145,
      minExpansionRatio: 28,
      requiredTokens: [
        "[ROLE]",
        "[OBJECTIVE]",
        "implementation-ready technical response",
        "verification steps",
        "[VALIDATION CHECKLIST]",
        "[ASSUMPTION POLICY]",
        "[ACCEPTANCE TESTS]",
        "technical brief"
      ],
      forbiddenTokens: ["prompt-engineering commentary", "build-ready prompt", "CHAIN OF THOUGHT"]
    }
  },
  {
    id: "ar_short_code",
    input: "إتاحة React",
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Technical",
    expected: {
      language: "ar",
      frameworkLabel: "خطة تنفيذ",
      promptTypeLabel: "برمجة",
      minOutputWords: 135,
      minExpansionRatio: 24,
      requiredTokens: [
        "[الدور]",
        "[الهدف]",
        "استجابة تقنية جاهزة للتنفيذ",
        "خطوات التحقق",
        "[قائمة التحقق]",
        "[سياسة الافتراضات]",
        "[معايير القبول]",
        "موجزاً أو برومبتاً تقنياً"
      ],
      forbiddenTokens: ["تعليق على البرومبت", "برومبت بناء", "سلسلة التفكير"]
    }
  }
];

const rawUiLeakTokens = [
  "COAST",
  "RISEN",
  "CARE",
  "TRACE",
  "APE",
  "RTF",
  "CHAIN_OF_THOUGHT",
  "FEW_SHOT",
  "CODE_GENERATION",
  "IMAGE_GENERATION",
  "CREATIVE_WRITING",
  "BUSINESS"
];

const countWords = (value) =>
  value
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;

const scoreScenario = (promptText, spanTexts, expected, inputWordCount) => {
  let score = 100;
  const notes = [];
  const outputWordCount = countWords(promptText);
  const expansionRatio = Number((outputWordCount / Math.max(inputWordCount, 1)).toFixed(2));

  for (const token of expected.requiredTokens) {
    if (!promptText.includes(token)) {
      score -= 8;
      notes.push(`Missing required token: ${token}`);
    }
  }

  for (const token of expected.forbiddenTokens) {
    if (promptText.includes(token)) {
      score -= 10;
      notes.push(`Found forbidden token: ${token}`);
    }
  }

  if (!spanTexts.includes(expected.frameworkLabel)) {
    score -= 8;
    notes.push(`Missing framework badge label: ${expected.frameworkLabel}`);
  }

  if (!spanTexts.includes(expected.promptTypeLabel)) {
    score -= 8;
    notes.push(`Missing prompt type badge label: ${expected.promptTypeLabel}`);
  }

  if (outputWordCount < expected.minOutputWords) {
    score -= 10;
    notes.push(`Output too short: ${outputWordCount} words < ${expected.minOutputWords}`);
  }

  if (expansionRatio < expected.minExpansionRatio) {
    score -= 10;
    notes.push(`Expansion ratio too low: ${expansionRatio} < ${expected.minExpansionRatio}`);
  }

  const leakedUiTokens = rawUiLeakTokens.filter((token) => spanTexts.includes(token));
  if (leakedUiTokens.length > 0) {
    score -= leakedUiTokens.length * 6;
    notes.push(`Raw enum leaked into badge UI: ${leakedUiTokens.join(", ")}`);
  }

  if (expected.language === "ar" && !/[\u0600-\u06FF]/.test(promptText)) {
    score -= 20;
    notes.push("Arabic prompt did not preserve Arabic output.");
  }

  if (expected.language === "en" && /[\u0600-\u06FF]{8,}/.test(promptText)) {
    score -= 6;
    notes.push("English prompt contains unexpected extended Arabic content.");
  }

  return {
    score: Math.max(score, 0),
    notes,
    outputWordCount,
    expansionRatio
  };
};

test("frontend short prompts expand into professional high-signal prompts in English and Arabic", async ({ page }) => {
  const report = [];

  await ensureSignedIn(page);

  const textarea = page.locator("textarea");
  const selects = page.locator("select");
  const generateButton = page.getByRole("button", { name: /^Generate Prompt$/ });
  const outputPre = page.locator("pre").last();

  for (const scenario of scenarios) {
    await textarea.fill(scenario.input);
    await selects.nth(0).selectOption(scenario.targetAI);
    await selects.nth(1).selectOption(scenario.promptType);
    await selects.nth(2).selectOption(scenario.tone);

    const previousOutput =
      (await outputPre
        .textContent({
          timeout: 500
        })
        .catch(() => "")) ?? "";
    const startedAt = Date.now();

    await generateButton.click();
    await expect(page.getByText("Prompt generated successfully.").last()).toBeVisible({
      timeout: 30_000
    });
    await page.waitForFunction(
      (priorText) => {
        const nodes = Array.from(document.querySelectorAll("pre"));
        const latest = nodes.at(-1)?.textContent?.trim() ?? "";
        return latest.length > 0 && latest !== priorText;
      },
      previousOutput.trim(),
      { timeout: 30_000 }
    );

    const durationMs = Date.now() - startedAt;
    const promptText = ((await outputPre.textContent()) ?? "").trim();
    const spanTexts = (await page.locator("span").evaluateAll((nodes) =>
      nodes
        .map((node) => node.textContent?.trim() ?? "")
        .filter((value) => value.length > 0)
    )).filter(Boolean);
    const quality = scoreScenario(promptText, spanTexts, scenario.expected, countWords(scenario.input));

    report.push({
      id: scenario.id,
      input: scenario.input,
      inputWordCount: countWords(scenario.input),
      durationMs,
      quality,
      badgeLabels: spanTexts.filter((text) =>
        [scenario.expected.frameworkLabel, scenario.expected.promptTypeLabel, "EN", "AR"].includes(text)
      ),
      preview: promptText.slice(0, 240)
    });
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        report
      },
      null,
      2
    )
  );

  for (const item of report) {
    expect(item.inputWordCount, `${item.id}: input should stay genuinely short`).toBeLessThanOrEqual(4);
    expect(item.quality.score, `${item.id}: ${item.quality.notes.join(" | ")}`).toBeGreaterThanOrEqual(92);
  }

  console.log(`UI enhancement report written to ${OUTPUT_PATH}`);
  console.log(JSON.stringify(report, null, 2));
});
