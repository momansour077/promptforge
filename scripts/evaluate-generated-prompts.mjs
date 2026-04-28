#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";

const backendBaseUrl = process.env.PROMPTFORGE_BACKEND_URL ?? "http://127.0.0.1:4000";
const apiBasePath = process.env.PROMPTFORGE_API_BASE_PATH ?? "/api";
const email = process.env.PROMPTFORGE_BENCH_EMAIL ?? "admin@promptforge.local";
const password = process.env.PROMPTFORGE_BENCH_PASSWORD ?? "PromptForgeAdmin!2026";
const mistralApiKey = process.env.MISTRAL_API_KEY;
const mistralBaseUrl = process.env.MISTRAL_BASE_URL ?? "https://api.mistral.ai/v1";
const executorModel = process.env.PROMPTFORGE_EVAL_EXECUTOR_MODEL ?? process.env.MISTRAL_MODEL ?? "mistral-large-latest";
const judgeModel = process.env.PROMPTFORGE_EVAL_JUDGE_MODEL ?? executorModel;
const scenarioLimit = Number(process.env.PROMPTFORGE_EVAL_SCENARIO_LIMIT ?? "0");
const requestTimeoutMs = Number(process.env.PROMPTFORGE_EVAL_TIMEOUT_MS ?? "90000");
const maxModelRetries = Number(process.env.PROMPTFORGE_EVAL_MODEL_RETRIES ?? "3");

if (!mistralApiKey) {
  console.error("MISTRAL_API_KEY is required to run the downstream evaluation harness.");
  process.exit(1);
}

const scenarios = [
  {
    id: "en_product_words_app",
    language: "en",
    requestBody: {
      rawInput: "kids word app"
    },
    expectedGeneratedPrompt: {
      promptType: "CODE_GENERATION",
      framework: "COAST",
      requiredTokens: ["[VALIDATION CHECKLIST]", "[ASSUMPTION POLICY]", "[VERIFICATION STEPS]", "[ACCEPTANCE TESTS]"]
    },
    downstreamTask: {
      objective: "Produce a production-ready implementation brief for the app idea.",
      expectedLanguage: "en",
      requiredOutputHints: ["age range", "learning", "safety", "API", "MVP", "metrics"],
      minWords: 260
    }
  },
  {
    id: "ar_product_words_app",
    language: "ar",
    requestBody: {
      rawInput: "تطبيق كلمات للأطفال"
    },
    expectedGeneratedPrompt: {
      promptType: "CODE_GENERATION",
      framework: "COAST",
      requiredTokens: ["[قائمة التحقق]", "[سياسة الافتراضات]", "[خطوات التحقق]", "[معايير القبول]"]
    },
    downstreamTask: {
      objective: "قدّم موجز تنفيذ جاهزاً للإنتاج لفكرة التطبيق.",
      expectedLanguage: "ar",
      requiredOutputHints: ["الفئة العمرية", "التعلّم", "السلامة", "الواجهات", "النسخة الأولى", "المقاييس"],
      minWords: 230
    }
  },
  {
    id: "en_b2b_pricing_research",
    language: "en",
    requestBody: {
      rawInput: "research the best pricing model for a B2B SaaS analytics product"
    },
    expectedGeneratedPrompt: {
      promptType: "RESEARCH",
      framework: "CHAIN_OF_THOUGHT",
      requiredTokens: ["[VALIDATION CHECKLIST]", "[ASSUMPTION POLICY]", "[SOURCE POLICY]"]
    },
    downstreamTask: {
      objective: "Produce an evidence-oriented pricing research brief with a defensible recommendation.",
      expectedLanguage: "en",
      requiredOutputHints: ["evidence", "criteria", "uncertainty", "pricing", "recommendation", "risk"],
      minWords: 180
    }
  },
  {
    id: "ar_react_accessibility",
    language: "ar",
    requestBody: {
      rawInput: "إتاحة React",
      tone: "Technical"
    },
    expectedGeneratedPrompt: {
      promptType: "CODE_GENERATION",
      framework: "COAST",
      requiredTokens: ["[قائمة التحقق]", "[سياسة الافتراضات]", "[خطوات التحقق]", "[معايير القبول]"]
    },
    downstreamTask: {
      objective: "قدّم موجزاً تقنياً عملياً لتحسين الإتاحة في واجهة React.",
      expectedLanguage: "ar",
      requiredOutputHints: ["React", "إمكانية الوصول", "الاختبارات", "التحقق", "لوحة المفاتيح", "قارئات الشاشة"],
      minWords: 170
    }
  }
];

const activeScenarios = scenarioLimit > 0 ? scenarios.slice(0, scenarioLimit) : scenarios;

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
const logProgress = (message) => {
  console.error(`[promptforge-eval] ${message}`);
};
const sleep = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

const extractJsonObject = (raw) => {
  const trimmed = raw.trim().replace(/^```json\s*/u, "").replace(/^```\s*/u, "").replace(/\s*```$/u, "");
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return trimmed;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
};

const parseJsonPayload = (raw, context) => {
  const candidates = [raw, extractJsonObject(raw)];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`${context} returned invalid JSON: ${raw.slice(0, 240)}`);
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

  const response = await fetch(`${backendBaseUrl}${path}`, {
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

const parseExecutionMessages = (generatedPrompt) => {
  const systemMarker = "[SYSTEM MESSAGE]";
  const userMarker = "[USER MESSAGE]";

  if (generatedPrompt.includes(systemMarker) && generatedPrompt.includes(userMarker)) {
    const [, afterSystem] = generatedPrompt.split(systemMarker);
    const [systemContent, userContent] = afterSystem.split(userMarker);

    return [
      {
        role: "system",
        content: systemContent.trim()
      },
      {
        role: "user",
        content: userContent.trim()
      }
    ];
  }

  return [
    {
      role: "user",
      content: generatedPrompt
    }
  ];
};

const runMistralChat = async ({ model, messages, temperature = 0.2, maxTokens = 1500, responseFormat }) => {
  for (let attempt = 0; attempt < maxModelRetries; attempt += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), requestTimeoutMs);
    let response;

    try {
      response = await fetch(`${mistralBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mistralApiKey}`
        },
        signal: abortController.signal,
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages,
          ...(responseFormat ? { response_format: responseFormat } : {})
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text();
      const retryable = response.status === 429 || response.status >= 500;

      if (retryable && attempt < maxModelRetries - 1) {
        const delayMs = 1500 * (attempt + 1);
        logProgress(`Model call retry ${attempt + 1}/${maxModelRetries - 1} after ${response.status}; waiting ${delayMs} ms`);
        await sleep(delayMs);
        continue;
      }

      throw new Error(`Mistral chat completion failed with ${response.status}: ${text}`);
    }

    const payload = await response.json();
    return {
      content: payload.choices?.[0]?.message?.content ?? "",
      usage: payload.usage ?? null
    };
  }

  throw new Error("Mistral chat completion failed without producing a response");
};

const judgeResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "promptforge_eval_judgement",
    schema: {
      type: "object",
      properties: {
        overallScore: { type: "number" },
        taskCompletionScore: { type: "number" },
        specificityScore: { type: "number" },
        actionabilityScore: { type: "number" },
        structureScore: { type: "number" },
        languageScore: { type: "number" },
        strengths: {
          type: "array",
          items: { type: "string" }
        },
        weaknesses: {
          type: "array",
          items: { type: "string" }
        },
        upgradeOpportunities: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: [
        "overallScore",
        "taskCompletionScore",
        "specificityScore",
        "actionabilityScore",
        "structureScore",
        "languageScore",
        "strengths",
        "weaknesses",
        "upgradeOpportunities"
      ],
      additionalProperties: false
    }
  }
};

const buildJudgeMessages = ({ scenario, generatedPrompt, downstreamOutput }) => [
  {
    role: "system",
    content: [
      "You are a strict prompt-evaluation judge for PromptForge.",
      "Evaluate whether the generated prompt produced a professional, high-signal downstream answer.",
      "Score from 0 to 100 with harsh standards. Prefer under-scoring over leniency.",
      "Do not judge the idea itself. Judge prompt effectiveness through the downstream output quality.",
      "Return valid JSON only."
    ].join(" ")
  },
  {
    role: "user",
    content: JSON.stringify({
      scenarioId: scenario.id,
      scenarioObjective: scenario.downstreamTask.objective,
      expectedLanguage: scenario.downstreamTask.expectedLanguage,
      requiredOutputHints: scenario.downstreamTask.requiredOutputHints,
      minimumWordCount: scenario.downstreamTask.minWords,
      generatedPrompt,
      downstreamOutput
    })
  }
];

const runJudgeEvaluation = async ({ scenario, generatedPrompt, downstreamOutput }) => {
  let lastError = null;

  for (let attempt = 0; attempt < maxModelRetries; attempt += 1) {
    const judgeResult = await runMistralChat({
      model: judgeModel,
      messages: buildJudgeMessages({
        scenario,
        generatedPrompt,
        downstreamOutput
      }),
      temperature: 0,
      maxTokens: 800,
      responseFormat: judgeResponseFormat
    });

    try {
      return {
        payload: parseJsonPayload(judgeResult.content, `judge ${scenario.id}`),
        usage: judgeResult.usage
      };
    } catch (error) {
      lastError = error;

      if (attempt < maxModelRetries - 1) {
        const delayMs = 1000 * (attempt + 1);
        logProgress(`Judge JSON retry ${attempt + 1}/${maxModelRetries - 1} for ${scenario.id}; waiting ${delayMs} ms`);
        await sleep(delayMs);
      }
    }
  }

  throw lastError ?? new Error(`judge ${scenario.id} failed without a parseable payload`);
};

const scoreHeuristics = ({ scenario, generatedPrompt, generatedPayload, downstreamOutput }) => {
  const notes = [];
  let score = 100;
  const generatedWordCount = countWords(generatedPrompt);
  const downstreamWordCount = countWords(downstreamOutput);
  const loweredOutput = downstreamOutput.toLowerCase();

  if (generatedPayload.promptType !== scenario.expectedGeneratedPrompt.promptType) {
    score -= 12;
    notes.push(`prompt type mismatch: ${generatedPayload.promptType}`);
  }

  if (generatedPayload.framework !== scenario.expectedGeneratedPrompt.framework) {
    score -= 8;
    notes.push(`framework mismatch: ${generatedPayload.framework}`);
  }

  for (const token of scenario.expectedGeneratedPrompt.requiredTokens) {
    if (!generatedPrompt.includes(token)) {
      score -= 8;
      notes.push(`missing prompt token: ${token}`);
    }
  }

  if (downstreamWordCount < scenario.downstreamTask.minWords) {
    score -= 12;
    notes.push(`downstream output too short: ${downstreamWordCount} < ${scenario.downstreamTask.minWords}`);
  }

  const hintsFound = scenario.downstreamTask.requiredOutputHints.filter((hint) =>
    loweredOutput.includes(hint.toLowerCase())
  );

  if (hintsFound.length < Math.ceil(scenario.downstreamTask.requiredOutputHints.length / 2)) {
    score -= 12;
    notes.push(`limited downstream coverage: found ${hintsFound.length}/${scenario.downstreamTask.requiredOutputHints.length} hints`);
  }

  if (scenario.language === "ar") {
    if (countArabicChars(downstreamOutput) < 120) {
      score -= 15;
      notes.push("downstream Arabic output is too light");
    }
  } else if (countArabicChars(downstreamOutput) > 12) {
    score -= 6;
    notes.push("unexpected Arabic leakage in English downstream output");
  }

  return {
    score: Math.max(score, 0),
    notes,
    generatedWordCount,
    downstreamWordCount,
    hintsFound
  };
};

const evaluateScenario = async ({ jar, csrfToken, scenario }) => {
  logProgress(`Generating prompt for ${scenario.id}`);
  const generationStartedAt = performance.now();
  const generationResponse = await ensureSuccess(
    await request({
      jar,
      csrfToken,
      method: "POST",
      path: `${apiBasePath}/prompts/generate`,
      body: scenario.requestBody
    }),
    `generate ${scenario.id}`
  );
  const generationDurationMs = performance.now() - generationStartedAt;
  const generationPayload = await generationResponse.json();
  const generated = generationPayload.data.generated;
  const generatedPrompt = generated.generatedPrompt;

  logProgress(`Executing downstream model for ${scenario.id} with ${executorModel}`);
  const executionStartedAt = performance.now();
  const executionResult = await runMistralChat({
    model: executorModel,
    messages: parseExecutionMessages(generatedPrompt),
    temperature: 0.2,
    maxTokens: 1600
  });
  const executionDurationMs = performance.now() - executionStartedAt;
  const downstreamOutput = executionResult.content.trim();

  const heuristicScore = scoreHeuristics({
    scenario,
    generatedPrompt,
    generatedPayload: generated,
    downstreamOutput
  });

  logProgress(`Judging downstream output for ${scenario.id} with ${judgeModel}`);
  const judgeStartedAt = performance.now();
  const judgeResult = await runJudgeEvaluation({
    scenario,
    generatedPrompt,
    downstreamOutput
  });
  const judgeDurationMs = performance.now() - judgeStartedAt;

  return {
    id: scenario.id,
    language: scenario.language,
    requestBody: scenario.requestBody,
    generation: {
      durationMs: Math.round(generationDurationMs),
      source: generationResponse.headers.get("x-promptforge-source"),
      cache: generationResponse.headers.get("x-promptforge-cache"),
      aiCache: generationResponse.headers.get("x-promptforge-ai-cache"),
      generatedPrompt,
      promptType: generated.promptType,
      framework: generated.framework,
      domain: generated.domain,
      wordCount: generated.wordCount,
      estimatedTokens: generated.estimatedTokens
    },
    downstreamExecution: {
      model: executorModel,
      durationMs: Math.round(executionDurationMs),
      outputWordCount: heuristicScore.downstreamWordCount,
      outputPreview: downstreamOutput.slice(0, 400),
      usage: executionResult.usage
    },
    heuristicScore,
    judge: {
      model: judgeModel,
      durationMs: Math.round(judgeDurationMs),
      ...judgeResult.payload
    }
  };
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
  logProgress(`Logged in to PromptForge at ${backendBaseUrl}`);

  const results = [];

  for (const scenario of activeScenarios) {
    results.push(await evaluateScenario({ jar, csrfToken, scenario }));
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    backendBaseUrl,
    executorModel,
    judgeModel,
    averageHeuristicScore: Number((results.reduce((sum, result) => sum + result.heuristicScore.score, 0) / results.length).toFixed(1)),
    averageJudgeScore: Number((results.reduce((sum, result) => sum + result.judge.overallScore, 0) / results.length).toFixed(1)),
    averageGenerationMs: Math.round(results.reduce((sum, result) => sum + result.generation.durationMs, 0) / results.length),
    averageExecutionMs: Math.round(results.reduce((sum, result) => sum + result.downstreamExecution.durationMs, 0) / results.length),
    results
  };

  const outputDir = join("/tmp", "promptforge-evals");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, `eval-${Date.now()}.json`);
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ outputPath, ...summary }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
