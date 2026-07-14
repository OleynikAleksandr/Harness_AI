import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compile = (specifier) => {
  const source = readFileSync(new URL(specifier, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
};

const toDataUrl = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;

// The reader shells out to the claude CLI and reads provider JSONL files;
// stub those siblings so the env-resolution contract is testable on its own.
globalThis.__probeCalls = [];
const cwdResolverUrl = toDataUrl(
  "export const resolveCwdForClaudeSession = async ({ fallbackCwd }) => fallbackCwd;"
);
const probeUrl = toDataUrl(
  `export const runClaudeContextUsageProbe = async (options) => {
    globalThis.__probeCalls.push(options);
    return {
      cmd: "claude /context",
      code: 0,
      durationMs: 1,
      signal: null,
      stderrTail: "",
      stdoutTail: JSON.stringify({ used: 1234, limit: 200000 }),
      timeout: false,
    };
  };`
);
const providerJsonlUrl = toDataUrl(
  `export const resolveProviderJsonlPathForClaudeSession = async () => null;
   export const readSnapshotFromProviderJsonlWithRetries = async () => null;
   export const safeReadFileSize = async () => null;`
);
const snapshotUrl = toDataUrl(
  `export const extractSnapshotFromStreamJsonLine = (line) => {
    try {
      const parsed = JSON.parse(line);
      return typeof parsed?.used === "number"
        ? { used: parsed.used, limit: parsed.limit }
        : null;
    } catch {
      return null;
    }
  };`
);

const readerSource = compile("./claude-context-usage-reader.ts")
  .replaceAll("./claude-context-usage-cwd-resolver.js", cwdResolverUrl)
  .replaceAll("./claude-context-usage-probe.js", probeUrl)
  .replaceAll("./claude-context-usage-provider-jsonl.js", providerJsonlUrl)
  .replaceAll("./claude-context-usage-snapshot.js", snapshotUrl);
const { ClaudeContextUsageReader } = await import(toDataUrl(readerSource));

// Regression (2026-07-14 acceptance): the probe env must be resolved at every
// read. A one-shot snapshot taken at adapter initialize races the global-home
// liveness preflight and freezes the probe onto the global provider home
// while turns write transcripts to the workspace-local home, so `--resume`
// answers "No conversation found" forever.
let currentEnv = { HOME: "/global-home" };
const reader = new ClaudeContextUsageReader({
  executablePath: "/fake/claude",
  resolveEnv: () => currentEnv,
});

const first = await reader.read({ sessionId: "s-1", cwd: "/workspace" });
assert.deepEqual(first, { used: 1234, limit: 200_000 });
assert.equal(globalThis.__probeCalls[0].env.HOME, "/global-home");

currentEnv = { HOME: "/workspace-home" };
const second = await reader.read({ sessionId: "s-1", cwd: "/workspace" });
assert.deepEqual(second, { used: 1234, limit: 200_000 });
assert.equal(globalThis.__probeCalls[1].env.HOME, "/workspace-home");

// The resolved env is merged, not shared: mutating the probe env must not
// leak back into the object the resolver returned.
globalThis.__probeCalls[1].env.HOME = "/mutated";
assert.equal(currentEnv.HOME, "/workspace-home");

console.log("claude-context-usage-reader tests passed");
