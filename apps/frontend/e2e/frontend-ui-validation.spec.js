import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { ensureSignedIn } from "./support/auth.js";

const OUTPUT_PATH = "/tmp/promptforge-ui-validation.json";

const scenarios = [
  {
    id: "en_product_multiline",
    input: [
      "Build an application for kids to teach words.",
      "- Prioritize ages 4-8.",
      "- Include audio, repetition, rewards, and parent visibility.",
      "- Return a production-ready build prompt."
    ].join("\n"),
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Professional",
    expected: {
      language: "en",
      frameworkLabel: "Multi-step brief",
      promptTypeLabel: "Code",
      requiredTokens: [
        "[ROLE]",
        "[OBJECTIVE]",
        "[CONTEXT]",
        "[TASK]",
        "[DELIVERABLE]",
        "[OUTPUT FORMAT]",
        "[SUCCESS CRITERIA]",
        "[VALIDATION CHECKLIST]",
        "[ASSUMPTION POLICY]",
        "[VERIFICATION STEPS]",
        "[ACCEPTANCE TESTS]",
        "[EXECUTION APPROACH]",
        "Product Goal",
        "Recommended Tech Stack"
      ],
      forbiddenTokens: ["build-ready prompt", "prompt-engineering commentary", "CHAIN OF THOUGHT"]
    }
  },
  {
    id: "ar_research_multiline",
    input: [
      "ابحث أفضل نموذج تسعير لمنتج تحليلات SaaS موجه للشركات.",
      "- قارن بين الاشتراك الثابت والتسعير حسب الاستخدام.",
      "- راعِ طول دورة المبيعات ومتطلبات فرق المشتريات.",
      "- اطلب مخرجات قابلة للدفاع أمام الإدارة التنفيذية."
    ].join("\n"),
    targetAI: "GENERAL",
    promptType: "GENERAL",
    tone: "Professional",
    expected: {
      language: "ar",
      frameworkLabel: "استدلال منظم",
      promptTypeLabel: "بحث",
      requiredTokens: [
        "[الدور]",
        "[الهدف]",
        "[السياق]",
        "[المهمة]",
        "[المخرج المطلوب]",
        "[معايير النجاح]",
        "[قائمة التحقق]",
        "[سياسة الافتراضات]",
        "[سياسة المصادر]",
        "[منهج التنفيذ]",
        "التسعير",
        "الإدارة التنفيذية"
      ],
      forbiddenTokens: ["build-ready prompt", "prompt-engineering commentary", "CHAIN OF THOUGHT"]
    }
  },
  {
    id: "en_midjourney_multiline",
    input: [
      "Create a cinematic poster prompt for a robotics conference in Dubai.",
      "- Feature a humanoid robot on stage with a futuristic skyline.",
      "- Make it premium, energetic, and event-ready.",
      "- Optimize the prompt for Midjourney."
    ].join("\n"),
    targetAI: "MIDJOURNEY",
    promptType: "IMAGE_GENERATION",
    tone: "Creative",
    expected: {
      language: "en",
      frameworkLabel: "Creative brief",
      promptTypeLabel: "Image",
      requiredTokens: [
        "[VISUAL PROMPT]",
        "[STYLE]",
        "[LIGHTING]",
        "[COMPOSITION]",
        "[ASPECT RATIO]",
        "[NEGATIVE PROMPT]",
        "--ar 16:9"
      ],
      forbiddenTokens: ["framework", "prompt-engineering commentary"]
    }
  },
  {
    id: "ar_copilot_multiline",
    input: [
      "أعد هيكلة لوحة تحكم React لتحسين الأداء وإمكانية الوصول.",
      "- حافظ على الوظائف الحالية.",
      "- حسّن التنقل بلوحة المفاتيح ودعم قارئات الشاشة.",
      "- اطلب اختبارات مصاحبة وتوصيات واضحة للتنفيذ."
    ].join("\n"),
    targetAI: "COPILOT",
    promptType: "CODE_GENERATION",
    tone: "Technical",
    expected: {
      language: "ar",
      frameworkLabel: "موجز متعدد الخطوات",
      promptTypeLabel: "برمجة",
      requiredTokens: [
        "[CODE CONTEXT]",
        "[الدور]",
        "[الهدف]",
        "[المهمة]",
        "[معايير النجاح]",
        "[قائمة التحقق]",
        "[خطوات التحقق]",
        "[معايير القبول]",
        "React",
        "قارئات الشاشة"
      ],
      forbiddenTokens: ["build-ready prompt", "prompt-engineering commentary"]
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
  "CREATIVE_WRITING"
];

const scoreScenario = (promptText, spanTexts, expected) => {
  let score = 100;
  const notes = [];

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
    notes
  };
};

test("frontend prompt generation stays polished across multiline English and Arabic inputs", async ({ page }) => {
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
    const quality = scoreScenario(promptText, spanTexts, scenario.expected);

    // Optional evidence from synthetic test accounts; never capture a user's session.
    if (process.env.PROMPTFORGE_E2E_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.PROMPTFORGE_E2E_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(process.env.PROMPTFORGE_E2E_SCREENSHOT_DIR, `${scenario.id}.png`),
        fullPage: true
      });
      await page.screenshot({
        path: path.join(process.env.PROMPTFORGE_E2E_SCREENSHOT_DIR, `${scenario.id}-viewport.png`)
      });
    }

    report.push({
      id: scenario.id,
      inputLineCount: scenario.input.split("\n").length,
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
    expect(item.quality.score, `${item.id}: ${item.quality.notes.join(" | ")}`).toBeGreaterThanOrEqual(92);
    expect(item.inputLineCount).toBeGreaterThanOrEqual(4);
  }

  console.log(`UI validation report written to ${OUTPUT_PATH}`);
  console.log(JSON.stringify(report, null, 2));
});
