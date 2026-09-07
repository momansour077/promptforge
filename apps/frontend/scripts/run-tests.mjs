import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Vitest 3 / jsdom must own browser storage. Node 26's built-in Web Storage
// otherwise shadows jsdom's implementation before test setup can run.
const nodeMajor = Number(process.versions.node.split(".")[0]);
const nodeOptions = [process.env.NODE_OPTIONS ?? "",
  nodeMajor >= 26 ? "--no-experimental-webstorage" : ""].filter(Boolean).join(" ");
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url)),
  "run",
  ...process.argv.slice(2)
], { stdio: "inherit", env: { ...process.env, NODE_OPTIONS: nodeOptions } });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
