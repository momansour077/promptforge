#!/usr/bin/env ts-node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PROMPT_REGRESSION_SEEDS,
  generateRecordForSeed,
  scorePromptStructure,
  type PromptSnapshotBaseline,
  type PromptSnapshotRecord,
  type PromptRegressionSeed,
  type PromptStructuralScoreVector,
  type PromptTypeValue,
  type SupportedLanguage,
  type TargetAIValue
} from "./generate-snapshots.ts";

type ScoreDimension = keyof PromptStructuralScoreVector;

interface MetricDiff {
  name: ScoreDimension | "characterCount";
  baseline: number;
  current: number;
  dropPercent: number;
  thresholdPercent: number;
  flagged: boolean;
  reason: string;
}

interface SeedRegressionResult {
  id: string;
  inputSeed: string;
  taskType: PromptTypeValue;
  targetModel: TargetAIValue;
  language: SupportedLanguage;
  flagged: boolean;
  diffs: MetricDiff[];
  generatedPrompt: string;
}

interface RegressionReport {
  generatedAt: string;
  status: "clean" | "regression" | "skipped";
  baselinePath: string;
  reportPath: string;
  summary: {
    seedCount: number;
    flaggedSeedCount: number;
    flaggedMetricCount: number;
  };
  warning?: string;
  results: SeedRegressionResult[];
}

const currentFilePath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(currentFilePath);
const repoRoot = dirname(scriptsDir);
const baselinePath = join(repoRoot, "test", "snapshots", "prompt-baseline.json");
const reportPath = join(repoRoot, "regression-report.json");

const STRUCTURAL_DROP_THRESHOLD_PERCENT = 5;
const LENGTH_DROP_THRESHOLD_PERCENT = 15;
const MIN_ARABIC_CHARACTER_COUNT = 120;

const countCharacters = (value: string): number => value.trim().length;
const countArabicCharacters = (value: string): number =>
  (value.match(/[\u0600-\u06FF]/gu) ?? []).length;

const calculateDropPercent = (baseline: number, current: number): number => {
  if (baseline <= 0 || current >= baseline) {
    return 0;
  }

  return Number((((baseline - current) / baseline) * 100).toFixed(2));
};

const buildMetricDiff = (
  name: ScoreDimension | "characterCount",
  baseline: number,
  current: number,
  thresholdPercent: number,
  reason: string
): MetricDiff => {
  const dropPercent = calculateDropPercent(baseline, current);

  return {
    name,
    baseline,
    current,
    dropPercent,
    thresholdPercent,
    flagged: dropPercent > thresholdPercent,
    reason
  };
};

const loadBaseline = (): PromptSnapshotBaseline | null => {
  if (!existsSync(baselinePath)) {
    return null;
  }

  return JSON.parse(readFileSync(baselinePath, "utf8")) as PromptSnapshotBaseline;
};

const writeReport = (report: RegressionReport): void => {
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
};

const renderTable = (results: SeedRegressionResult[]): string => {
  const rows = results.flatMap((result) =>
    result.diffs.map((diff) => ({
      seed: result.id,
      metric: diff.name,
      baseline: diff.baseline.toString(),
      current: diff.current.toString(),
      drop: `${diff.dropPercent.toFixed(2)}%`,
      threshold: `${diff.thresholdPercent}%`,
      status: diff.flagged ? "FAIL" : "PASS"
    }))
  );

  const headers = {
    seed: "Seed",
    metric: "Metric",
    baseline: "Baseline",
    current: "Current",
    drop: "Drop",
    threshold: "Threshold",
    status: "Status"
  } as const;

  const widths = {
    seed: Math.max(headers.seed.length, ...rows.map((row) => row.seed.length)),
    metric: Math.max(headers.metric.length, ...rows.map((row) => row.metric.length)),
    baseline: Math.max(headers.baseline.length, ...rows.map((row) => row.baseline.length)),
    current: Math.max(headers.current.length, ...rows.map((row) => row.current.length)),
    drop: Math.max(headers.drop.length, ...rows.map((row) => row.drop.length)),
    threshold: Math.max(headers.threshold.length, ...rows.map((row) => row.threshold.length)),
    status: Math.max(headers.status.length, ...rows.map((row) => row.status.length))
  };

  const pad = (value: string, width: number): string => value.padEnd(width, " ");
  const divider = [
    "-".repeat(widths.seed),
    "-".repeat(widths.metric),
    "-".repeat(widths.baseline),
    "-".repeat(widths.current),
    "-".repeat(widths.drop),
    "-".repeat(widths.threshold),
    "-".repeat(widths.status)
  ].join(" | ");

  const table = [
    [
      pad(headers.seed, widths.seed),
      pad(headers.metric, widths.metric),
      pad(headers.baseline, widths.baseline),
      pad(headers.current, widths.current),
      pad(headers.drop, widths.drop),
      pad(headers.threshold, widths.threshold),
      pad(headers.status, widths.status)
    ].join(" | "),
    divider,
    ...rows.map((row) =>
      [
        pad(row.seed, widths.seed),
        pad(row.metric, widths.metric),
        pad(row.baseline, widths.baseline),
        pad(row.current, widths.current),
        pad(row.drop, widths.drop),
        pad(row.threshold, widths.threshold),
        pad(row.status, widths.status)
      ].join(" | ")
    )
  ];

  return table.join("\n");
};

const findBaselineRecord = (
  baseline: PromptSnapshotBaseline,
  seed: PromptRegressionSeed
): PromptSnapshotRecord => {
  const record = baseline.records.find((candidate) => candidate.id === seed.id);

  if (!record) {
    throw new Error(`Baseline record not found for seed ${seed.id}`);
  }

  return record;
};

const evaluateSeed = async (
  baselineRecord: PromptSnapshotRecord,
  seed: PromptRegressionSeed
): Promise<SeedRegressionResult> => {
  const currentRecord = await generateRecordForSeed(seed);
  const structuralScore = scorePromptStructure(currentRecord.generatedPrompt);
  const characterCount = countCharacters(currentRecord.generatedPrompt);
  const arabicCharacterCount = countArabicCharacters(currentRecord.generatedPrompt);

  const diffs: MetricDiff[] = [
    buildMetricDiff(
      "rolePresent",
      baselineRecord.structuralScore.rolePresent,
      structuralScore.rolePresent,
      STRUCTURAL_DROP_THRESHOLD_PERCENT,
      "role presence dropped"
    ),
    buildMetricDiff(
      "objectivePresent",
      baselineRecord.structuralScore.objectivePresent,
      structuralScore.objectivePresent,
      STRUCTURAL_DROP_THRESHOLD_PERCENT,
      "objective presence dropped"
    ),
    buildMetricDiff(
      "outputFormatPresent",
      baselineRecord.structuralScore.outputFormatPresent,
      structuralScore.outputFormatPresent,
      STRUCTURAL_DROP_THRESHOLD_PERCENT,
      "output format presence dropped"
    ),
    buildMetricDiff(
      "decisionRulesPresent",
      baselineRecord.structuralScore.decisionRulesPresent,
      structuralScore.decisionRulesPresent,
      STRUCTURAL_DROP_THRESHOLD_PERCENT,
      "decision rules presence dropped"
    ),
    buildMetricDiff(
      "sectionCount",
      baselineRecord.structuralScore.sectionCount,
      structuralScore.sectionCount,
      STRUCTURAL_DROP_THRESHOLD_PERCENT,
      "section count dropped"
    ),
    seed.language === "ar"
      ? buildMetricDiff(
          "characterCount",
          baselineRecord.metadata.characterCount,
          characterCount,
          LENGTH_DROP_THRESHOLD_PERCENT,
          "Arabic prompt character count shrank"
        )
      : buildMetricDiff(
          "wordCount",
          baselineRecord.structuralScore.wordCount,
          structuralScore.wordCount,
          LENGTH_DROP_THRESHOLD_PERCENT,
          "English prompt word count shrank"
        )
  ];

  if (seed.language === "ar" && arabicCharacterCount < MIN_ARABIC_CHARACTER_COUNT) {
    diffs.push({
      name: "characterCount",
      baseline: baselineRecord.metadata.arabicCharacterCount,
      current: arabicCharacterCount,
      dropPercent: calculateDropPercent(
        baselineRecord.metadata.arabicCharacterCount,
        arabicCharacterCount
      ),
      thresholdPercent: LENGTH_DROP_THRESHOLD_PERCENT,
      flagged: true,
      reason: `Arabic output is too light (${arabicCharacterCount} Arabic characters)`
    });
  }

  return {
    id: seed.id,
    inputSeed: seed.rawInput,
    taskType: seed.taskType,
    targetModel: seed.targetModel,
    language: seed.language,
    flagged: diffs.some((diff) => diff.flagged),
    diffs,
    generatedPrompt: currentRecord.generatedPrompt
  };
};

const main = async (): Promise<void> => {
  const baseline = loadBaseline();

  if (!baseline) {
    const report: RegressionReport = {
      generatedAt: new Date().toISOString(),
      status: "skipped",
      baselinePath,
      reportPath,
      summary: {
        seedCount: 0,
        flaggedSeedCount: 0,
        flaggedMetricCount: 0
      },
      warning:
        "Baseline snapshot file is missing. Run generate-snapshots.ts locally and commit test/snapshots/prompt-baseline.json.",
      results: []
    };

    writeReport(report);
    console.warn(report.warning);
    console.warn(`Regression report written to ${reportPath}`);
    process.exit(0);
  }

  const results: SeedRegressionResult[] = [];

  for (const seed of PROMPT_REGRESSION_SEEDS) {
    results.push(await evaluateSeed(findBaselineRecord(baseline, seed), seed));
  }
  const flaggedSeedCount = results.filter((result) => result.flagged).length;
  const flaggedMetricCount = results.reduce(
    (sum, result) => sum + result.diffs.filter((diff) => diff.flagged).length,
    0
  );

  const report: RegressionReport = {
    generatedAt: new Date().toISOString(),
    status: flaggedMetricCount > 0 ? "regression" : "clean",
    baselinePath,
    reportPath,
    summary: {
      seedCount: results.length,
      flaggedSeedCount,
      flaggedMetricCount
    },
    results
  };

  writeReport(report);

  console.log(renderTable(results));
  console.log("");
  console.log(`Regression report written to ${reportPath}`);

  if (flaggedMetricCount > 0) {
    console.error(
      `Prompt regression detected: ${flaggedMetricCount} flagged metric(s) across ${flaggedSeedCount} seed(s).`
    );
    process.exit(1);
  }

  console.log("Prompt regression check is clean.");
  process.exit(0);
};

if (process.argv[1] && resolve(process.argv[1]) === currentFilePath) {
  void main();
}
