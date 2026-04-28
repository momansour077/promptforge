#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.PROMPTFORGE_BACKEND_URL ?? "http://127.0.0.1:4000";
const apiBasePath = process.env.PROMPTFORGE_API_BASE_PATH ?? "/api";
const email = process.env.PROMPTFORGE_BENCH_EMAIL ?? "admin@promptforge.local";
const password = process.env.PROMPTFORGE_BENCH_PASSWORD ?? "PromptForgeAdmin!2026";

const universalMarkers = {
  en: [
    "[ROLE]",
    "[OBJECTIVE]",
    "[CONTEXT]",
    "[TASK]",
    "[DELIVERABLE]",
    "[OUTPUT FORMAT]",
    "[TONE & STYLE]",
    "[DECISION RULES]",
    "[SUCCESS CRITERIA]",
    "[CONSTRAINTS]",
    "[FAILURE MODES TO AVOID]",
    "[EXAMPLES]",
    "[EXECUTION APPROACH]"
  ],
  ar: [
    "[الدور]",
    "[الهدف]",
    "[السياق]",
    "[المهمة]",
    "[المخرج المطلوب]",
    "[صيغة الإخراج]",
    "[النبرة والأسلوب]",
    "[قواعد اتخاذ القرار]",
    "[معايير النجاح]",
    "[القيود]",
    "[ما يجب تجنبه]",
    "[أمثلة]",
    "[منهج التنفيذ]"
  ]
};

const imageMarkers = {
  en: [
    "[VISUAL PROMPT]",
    "[STYLE]",
    "[LIGHTING]",
    "[COMPOSITION]",
    "[ASPECT RATIO]",
    "[NEGATIVE PROMPT]"
  ],
  ar: [
    "[البرومبت البصري]",
    "[الأسلوب]",
    "[الإضاءة]",
    "[التكوين]",
    "[نسبة الأبعاد]",
    "[العناصر المستبعدة]"
  ]
};

const metaLeakPatterns = [
  /apply the framework precisely/iu,
  /transform the idea into (a )?prompt/iu,
  /use the (role|task|format|trace|coast|risen|care|ape)/iu,
  /prompt-engineering commentary/iu,
  /طبّق إطار/iu,
  /حول الفكرة/iu,
  /حوّل الفكرة/iu,
  /هندسة البرومبتات/iu
];

const benchmarkCases = [
  {
    id: "en_product_kids",
    language: "en",
    rawInput: "build an application for kids to teach words",
    expectedType: "CODE_GENERATION",
    expectedTargetAI: "GENERAL",
    expectedStart: "[ROLE]",
    domainHints: ["learning outcomes", "age", "privacy", "API", "MVP", "success metrics"],
    minWords: 260
  },
  {
    id: "ar_product_kids",
    language: "ar",
    rawInput: "ابنِ تطبيقاً للأطفال لتعليم الكلمات",
    expectedType: "CODE_GENERATION",
    expectedTargetAI: "GENERAL",
    expectedStart: "[الدور]",
    domainHints: ["الفئة العمرية", "مخرجات", "الخصوصية", "الواجهات البرمجية", "النسخة الأولى", "مقاييس النجاح"],
    minWords: 220
  },
  {
    id: "en_code_refactor",
    language: "en",
    rawInput: "refactor a React dashboard for accessibility and performance",
    expectedType: "CODE_GENERATION",
    expectedTargetAI: "GENERAL",
    expectedStart: "[ROLE]",
    domainHints: ["architecture", "edge cases", "tests", "accessibility", "performance", "verification"],
    minWords: 140
  },
  {
    id: "ar_code_refactor",
    language: "ar",
    rawInput: "أعد هيكلة لوحة تحكم React لتحسين الأداء وإمكانية الوصول",
    expectedType: "CODE_GENERATION",
    expectedTargetAI: "GENERAL",
    expectedStart: "[الدور]",
    domainHints: ["المعمارية", "الحالات الطرفية", "الاختبارات", "إمكانية الوصول", "الأداء", "التحقق"],
    minWords: 120
  },
  {
    id: "en_business_offer",
    language: "en",
    rawInput: "write a premium positioning prompt for a digital marketing consulting service",
    expectedType: "BUSINESS",
    expectedTargetAI: "GENERAL",
    expectedStart: "[ROLE]",
    domainHints: ["audience", "decision", "constraints", "deliverable", "recommendations", "success"],
    minWords: 130
  },
  {
    id: "ar_business_offer",
    language: "ar",
    rawInput: "اكتب برومبتاً احترافياً لوضع تموضع خدمة استشارات في التسويق الرقمي",
    expectedType: "BUSINESS",
    expectedTargetAI: "GENERAL",
    expectedStart: "[الدور]",
    domainHints: ["الجمهور", "معايير القرار", "القيود", "المخرج", "التوصيات", "النجاح"],
    minWords: 110
  },
  {
    id: "en_research_brief",
    language: "en",
    rawInput: "research the best pricing model for a B2B SaaS analytics product",
    expectedType: "RESEARCH",
    expectedTargetAI: "GENERAL",
    expectedStart: "[ROLE]",
    domainHints: ["research objective", "evidence", "evaluation criteria", "assumptions", "sources", "recommendation"],
    minWords: 130
  },
  {
    id: "ar_research_brief",
    language: "ar",
    rawInput: "ابحث أفضل نموذج تسعير لمنتج تحليلات SaaS موجه للشركات",
    expectedType: "RESEARCH",
    expectedTargetAI: "GENERAL",
    expectedStart: "[الدور]",
    domainHints: ["هدف البحث", "الأدلة", "معايير التقييم", "الافتراضات", "المصادر", "التوصية"],
    minWords: 120
  },
  {
    id: "en_chatgpt_creative",
    language: "en",
    rawInput: "write a launch story for a coffee brand targeting startup founders",
    expectedType: "CREATIVE_WRITING",
    expectedTargetAI: "CHATGPT",
    expectedStart: "[SYSTEM MESSAGE]",
    body: {
      targetAI: "CHATGPT"
    },
    domainHints: ["audience", "voice", "structure", "quality", "creative", "angle"],
    minWords: 120
  },
  {
    id: "ar_chatgpt_creative",
    language: "ar",
    rawInput: "اكتب قصة إطلاق لعلامة قهوة تستهدف مؤسسي الشركات الناشئة",
    expectedType: "CREATIVE_WRITING",
    expectedTargetAI: "CHATGPT",
    expectedStart: "[SYSTEM MESSAGE]",
    body: {
      targetAI: "CHATGPT"
    },
    domainHints: ["الجمهور", "الصوت", "البنية", "الجودة", "إبداعي", "الزاوية"],
    minWords: 100
  },
  {
    id: "en_midjourney_image",
    language: "en",
    rawInput: "create a cinematic poster prompt for a robotics conference in Dubai",
    expectedType: "IMAGE_GENERATION",
    expectedTargetAI: "MIDJOURNEY",
    expectedStart: "[VISUAL PROMPT]",
    body: {
      targetAI: "MIDJOURNEY"
    },
    domainHints: ["cinematic", "lighting", "composition", "aspect ratio", "negative", "poster"],
    minWords: 55
  },
  {
    id: "ar_midjourney_image",
    language: "ar",
    rawInput: "أنشئ برومبت بوستر سينمائي لمؤتمر روبوتات في دبي",
    expectedType: "IMAGE_GENERATION",
    expectedTargetAI: "MIDJOURNEY",
    expectedStart: "[البرومبت البصري]",
    body: {
      targetAI: "MIDJOURNEY"
    },
    domainHints: ["سينمائي", "الإضاءة", "التكوين", "نسبة الأبعاد", "العناصر المستبعدة", "بوستر"],
    minWords: 45
  }
];

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromResponse(response) {
    const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
    const values = typeof getSetCookie === "function"
      ? getSetCookie()
      : splitSetCookieHeader(response.headers.get("set-cookie"));

    for (const value of values) {
      const [pair] = value.split(";");
      const separatorIndex = pair.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const cookieValue = pair.slice(separatorIndex + 1).trim();

      if (!name) {
        continue;
      }

      this.cookies.set(name, cookieValue);
    }
  }

  toHeader() {
    return Array.from(this.cookies.entries(), ([name, value]) => `${name}=${value}`).join("; ");
  }
}

const splitSetCookieHeader = (value) => {
  if (!value) {
    return [];
  }

  return value.split(/,(?=[^;,]+=)/u).map((part) => part.trim()).filter(Boolean);
};

const countWords = (text) => text.trim().split(/\s+/u).filter(Boolean).length;

const countArabicChars = (text) => (text.match(/[\u0600-\u06FF]/gu) ?? []).length;

const hasMetaLeak = (text) => metaLeakPatterns.some((pattern) => pattern.test(text));

const getRequiredMarkers = (benchmarkCase) => {
  if (benchmarkCase.expectedTargetAI === "MIDJOURNEY") {
    return imageMarkers[benchmarkCase.language];
  }

  const baseMarkers = universalMarkers[benchmarkCase.language];

  if (benchmarkCase.expectedTargetAI === "CHATGPT") {
    return ["[SYSTEM MESSAGE]", "[USER MESSAGE]", ...baseMarkers];
  }

  return baseMarkers;
};

const scoreLanguage = (benchmarkCase, generated) => {
  let score = 0;
  const notes = [];
  const text = generated.generatedPrompt;

  if (generated.detectedLanguage === benchmarkCase.language) {
    score += 10;
  } else {
    notes.push(`detected language ${generated.detectedLanguage} != ${benchmarkCase.language}`);
  }

  if (benchmarkCase.language === "ar") {
    const arabicChars = countArabicChars(text);

    if (arabicChars >= 180) {
      score += 10;
    } else {
      notes.push(`Arabic script content is light (${arabicChars} chars)`);
    }
  } else {
    const arabicChars = countArabicChars(text);

    if (arabicChars === 0) {
      score += 10;
    } else if (arabicChars <= 8) {
      score += 8;
    } else {
      notes.push(`unexpected Arabic script content (${arabicChars} chars)`);
    }
  }

  return { score, notes };
};

const scoreStructure = (benchmarkCase, generated) => {
  const text = generated.generatedPrompt;
  const markers = getRequiredMarkers(benchmarkCase);
  const present = markers.filter((marker) => text.includes(marker));
  let score = Math.round((present.length / markers.length) * 20);
  const notes = [];

  if (present.length !== markers.length) {
    notes.push(`missing markers: ${markers.filter((marker) => !present.includes(marker)).join(", ")}`);
  }

  if (text.trimStart().startsWith(benchmarkCase.expectedStart)) {
    score += 5;
  } else {
    notes.push(`prompt starts with ${text.trimStart().slice(0, 40)} instead of ${benchmarkCase.expectedStart}`);
  }

  return { score, notes };
};

const scoreDirectness = (generated) => {
  const notes = [];
  let score = 20;

  if (hasMetaLeak(generated.generatedPrompt)) {
    score -= 12;
    notes.push("meta leakage detected");
  }

  const fillerPatterns = [
    /here'?s your prompt/iu,
    /below is the prompt/iu,
    /فيما يلي/iu,
    /إليك/iu
  ];

  if (fillerPatterns.some((pattern) => pattern.test(generated.generatedPrompt.slice(0, 200)))) {
    score -= 8;
    notes.push("intro filler detected");
  }

  return { score: Math.max(score, 0), notes };
};

const scoreTargetFit = (benchmarkCase, generated) => {
  const text = generated.generatedPrompt;
  const notes = [];
  let score = 0;

  if (generated.targetAISuggestion === benchmarkCase.expectedTargetAI) {
    score += 7;
  } else {
    notes.push(`target AI ${generated.targetAISuggestion} != ${benchmarkCase.expectedTargetAI}`);
  }

  if (benchmarkCase.expectedTargetAI === "GENERAL") {
    if (!text.startsWith("[SYSTEM MESSAGE]") && !text.startsWith("<context>") && !text.startsWith("[VISUAL PROMPT]") && !text.startsWith("[البرومبت البصري]")) {
      score += 8;
    } else {
      notes.push("unexpected wrapper for GENERAL target");
    }
  } else if (benchmarkCase.expectedTargetAI === "CHATGPT") {
    if (text.includes("[SYSTEM MESSAGE]") && text.includes("[USER MESSAGE]")) {
      score += 8;
    } else {
      notes.push("missing ChatGPT wrapper sections");
    }
  } else if (benchmarkCase.expectedTargetAI === "MIDJOURNEY") {
    const required = imageMarkers[benchmarkCase.language];
    const present = required.filter((marker) => text.includes(marker));

    if (present.length === required.length) {
      score += 8;
    } else {
      notes.push("image prompt wrapper is incomplete");
    }
  }

  return { score, notes };
};

const scoreSpecificity = (benchmarkCase, generated) => {
  const text = generated.generatedPrompt.toLowerCase();
  const notes = [];
  let score = 0;
  const wordCount = countWords(generated.generatedPrompt);

  if (wordCount >= benchmarkCase.minWords) {
    score += 8;
  } else {
    notes.push(`word count ${wordCount} < ${benchmarkCase.minWords}`);
  }

  const hintsFound = benchmarkCase.domainHints.filter((hint) =>
    text.includes(hint.toLowerCase())
  );
  score += Math.min(12, hintsFound.length * 2);

  if (hintsFound.length < 4) {
    notes.push(`limited domain cues: found ${hintsFound.length}/${benchmarkCase.domainHints.length}`);
  }

  return { score, notes };
};

const scoreCase = (benchmarkCase, responsePayload, headers, durationMs) => {
  const generated = responsePayload.data.generated;
  const language = scoreLanguage(benchmarkCase, generated);
  const structure = scoreStructure(benchmarkCase, generated);
  const directness = scoreDirectness(generated);
  const targetFit = scoreTargetFit(benchmarkCase, generated);
  const specificity = scoreSpecificity(benchmarkCase, generated);
  const total = language.score + structure.score + directness.score + targetFit.score + specificity.score;
  const notes = [
    ...language.notes,
    ...structure.notes,
    ...directness.notes,
    ...targetFit.notes,
    ...specificity.notes
  ];

  return {
    id: benchmarkCase.id,
    input: benchmarkCase.rawInput,
    language: benchmarkCase.language,
    durationMs: Math.round(durationMs),
    score: total,
    headers: {
      source: headers.get("x-promptforge-source"),
      cache: headers.get("x-promptforge-cache"),
      aiCache: headers.get("x-promptforge-ai-cache"),
      fallback: headers.get("x-promptforge-fallback")
    },
    analysis: {
      detectedLanguage: generated.detectedLanguage,
      promptType: generated.promptType,
      targetAI: generated.targetAISuggestion,
      tone: generated.tone,
      domain: generated.domain,
      wordCount: generated.wordCount,
      estimatedTokens: generated.estimatedTokens
    },
    sections: {
      language: language.score,
      structure: structure.score,
      directness: directness.score,
      targetFit: targetFit.score,
      specificity: specificity.score
    },
    notes,
    preview: generated.generatedPrompt.slice(0, 300)
  };
};

const request = async ({ jar, csrfToken, method, path, body }) => {
  const headers = {
    Accept: "application/json",
    Cookie: jar.toHeader()
  };

  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  jar.setFromResponse(response);

  return response;
};

const ensureSuccess = async (response, context) => {
  if (response.ok) {
    return response;
  }

  const text = await response.text();
  throw new Error(`${context} failed with ${response.status}: ${text}`);
};

const main = async () => {
  const jar = new CookieJar();

  const bootstrapResponse = await ensureSuccess(
    await request({
      jar,
      method: "GET",
      path: "/health"
    }),
    "health bootstrap"
  );

  const csrfToken = bootstrapResponse.headers.get("x-csrf-token");

  if (!csrfToken) {
    throw new Error("Bootstrap request did not return X-CSRF-Token");
  }

  await ensureSuccess(
    await request({
      jar,
      csrfToken,
      method: "POST",
      path: `${apiBasePath}/auth/login`,
      body: {
        email,
        password
      }
    }),
    "login"
  );

  const results = [];

  for (const benchmarkCase of benchmarkCases) {
    const startedAt = performance.now();
    const response = await ensureSuccess(
      await request({
        jar,
        csrfToken,
        method: "POST",
        path: `${apiBasePath}/prompts/generate`,
        body: {
          rawInput: benchmarkCase.rawInput,
          ...(benchmarkCase.body ?? {})
        }
      }),
      benchmarkCase.id
    );
    const durationMs = performance.now() - startedAt;
    const payload = await response.json();

    results.push(scoreCase(benchmarkCase, payload, response.headers, durationMs));
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    averageScore: Number((results.reduce((sum, result) => sum + result.score, 0) / results.length).toFixed(1)),
    averageDurationMs: Math.round(results.reduce((sum, result) => sum + result.durationMs, 0) / results.length),
    minScore: Math.min(...results.map((result) => result.score)),
    maxScore: Math.max(...results.map((result) => result.score)),
    slowestMs: Math.max(...results.map((result) => result.durationMs)),
    fastestMs: Math.min(...results.map((result) => result.durationMs)),
    results
  };

  const outputDir = join("/tmp", "promptforge-benchmarks");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, `benchmark-${Date.now()}.json`);
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ outputPath, ...summary }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
