# Outcome Evaluation Harness

PromptForge now has two different quality layers:

1. Prompt artifact quality
   - Does the generated prompt have the right structure, language fidelity, and execution contract?
2. Downstream outcome quality
   - Does that generated prompt actually produce a strong answer when another model executes it?

The browser suites already cover prompt artifact quality. This harness covers downstream outcome quality.

## Script

Run:

```bash
cd /Users/mohamedmansour/promptforge
node --env-file=.env scripts/evaluate-generated-prompts.mjs
```

Optional environment overrides:

```bash
PROMPTFORGE_BACKEND_URL=http://127.0.0.1:4000
PROMPTFORGE_API_BASE_PATH=/api
PROMPTFORGE_BENCH_EMAIL=admin@promptforge.local
PROMPTFORGE_BENCH_PASSWORD=PromptForgeAdmin!2026
PROMPTFORGE_EVAL_EXECUTOR_MODEL=mistral-large-latest
PROMPTFORGE_EVAL_JUDGE_MODEL=mistral-large-latest
PROMPTFORGE_EVAL_SCENARIO_LIMIT=2
```

## What It Does

For each scenario:

1. Logs into the live PromptForge backend.
2. Generates a prompt through the real `/api/prompts/generate` path.
3. Sends that generated prompt to a downstream model for execution.
4. Scores the downstream answer with:
   - heuristic checks
   - a strict LLM judge
5. Writes a report to:

```text
/tmp/promptforge-evals/eval-<timestamp>.json
```

## Current Coverage

The initial scenarios cover:

- short English product idea
- short Arabic product idea
- English B2B SaaS pricing research
- short Arabic technical request

## Reading The Report

Key fields:

- `averageHeuristicScore`
- `averageJudgeScore`
- `averageGenerationMs`
- `averageExecutionMs`

Per-scenario:

- generated prompt metadata
- downstream output preview
- heuristic score notes
- judge strengths
- judge weaknesses
- upgrade opportunities

## Important Limitation

The first version uses Mistral both as:

- the downstream executor
- the judge

This is useful for fast iteration, but it is not the final state. The next upgrade is to add provider-specific executors and judges so PromptForge can be tested against:

- ChatGPT
- Claude
- Gemini
- Copilot-style code tasks
- image-model prompt execution paths

## Recommended Workflow

1. Relaunch PromptForge from the desktop icon.
2. Run:

```bash
cd /Users/mohamedmansour/promptforge/apps/frontend
npm run test:e2e
npm run test:e2e:enhancement
```

3. Run:

```bash
cd /Users/mohamedmansour/promptforge
node --env-file=.env scripts/evaluate-generated-prompts.mjs
```

4. Use the report to decide whether a prompt-engine change improved:
   - prompt quality
   - downstream answer quality
   - latency
