import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const captureServiceSource = readFileSync(
  new URL("./claude-native-request-capture-service.ts", import.meta.url),
  "utf8"
);
assert.match(captureServiceSource, /options\.selectedReasoningEffort/u);
assert.match(
  captureServiceSource,
  /runClaudeInteractiveCli\(\{[\s\S]*?reasoningEffort,/u
);

function compile(file) {
  return ts.transpileModule(
    readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
}

const buildDir = await mkdtemp(
  path.join(tmpdir(), "claude-interactive-cli-runner-test-")
);
writeFileSync(
  path.join(buildDir, "claude-interactive-cli-runner.js"),
  compile("claude-interactive-cli-runner.ts"),
  "utf8"
);
const { buildPtyDriverArgv, upsertInteractiveTrustConfig } = await import(
  pathToFileURL(path.join(buildDir, "claude-interactive-cli-runner.js")).href
);

// upsertInteractiveTrustConfig: bootstraps the interactive prerequisites on
// an empty provider home.
{
  const raw = upsertInteractiveTrustConfig(null, "/tmp/probe-ws");
  const config = JSON.parse(raw);
  assert.equal(config.hasCompletedOnboarding, true);
  assert.equal(config.projects["/tmp/probe-ws"].hasTrustDialogAccepted, true);
}

// upsertInteractiveTrustConfig: preserves unrelated CLI state and other
// project entries.
{
  const existing = JSON.stringify({
    customApiKeyResponses: { approved: ["abc"] },
    hasCompletedOnboarding: false,
    projects: {
      "/other/ws": { hasTrustDialogAccepted: true, history: ["x"] },
      "/tmp/probe-ws": { history: ["keep-me"] },
    },
    theme: "dark",
  });
  const config = JSON.parse(
    upsertInteractiveTrustConfig(existing, "/tmp/probe-ws")
  );
  assert.equal(config.theme, "dark");
  assert.deepEqual(config.customApiKeyResponses, { approved: ["abc"] });
  assert.equal(config.hasCompletedOnboarding, true);
  assert.deepEqual(config.projects["/other/ws"], {
    hasTrustDialogAccepted: true,
    history: ["x"],
  });
  assert.deepEqual(config.projects["/tmp/probe-ws"], {
    hasTrustDialogAccepted: true,
    history: ["keep-me"],
  });
}

// upsertInteractiveTrustConfig: an unreadable config is rebuilt instead of
// crashing the capture run.
{
  const config = JSON.parse(
    upsertInteractiveTrustConfig("{not json", "/tmp/probe-ws")
  );
  assert.equal(config.hasCompletedOnboarding, true);
  assert.equal(config.projects["/tmp/probe-ws"].hasTrustDialogAccepted, true);
}

// upsertInteractiveTrustConfig: nothing missing -> null, the config file is
// left untouched (it is a symlink to the user's live Claude config).
{
  const existing = JSON.stringify({
    hasCompletedOnboarding: true,
    projects: { "/tmp/probe-ws": { hasTrustDialogAccepted: true } },
    theme: "dark",
  });
  assert.equal(upsertInteractiveTrustConfig(existing, "/tmp/probe-ws"), null);
}

// buildPtyDriverArgv: python -c driver, binary, probe, timings in seconds,
// then the model args for the binary.
{
  const argv = buildPtyDriverArgv({
    binaryPath: "/bin/claude",
    bootWaitMs: 15_000,
    modelId: "claude-opus-4-8",
    postSubmitWaitMs: 25_000,
    probePrompt: "probe text",
    reasoningEffort: "max",
  });
  assert.equal(argv[0], "-c");
  assert.ok(argv[1].includes("pty.fork"));
  assert.deepEqual(argv.slice(2), [
    "/bin/claude",
    "probe text",
    "15",
    "25",
    "--model",
    "claude-opus-4-8",
    "--effort",
    "max",
  ]);
}

// buildPtyDriverArgv: no model selected -> the binary runs with its default.
{
  const argv = buildPtyDriverArgv({
    binaryPath: "/bin/claude",
    bootWaitMs: 10_000,
    modelId: null,
    postSubmitWaitMs: 20_000,
    probePrompt: "probe",
  });
  assert.deepEqual(argv.slice(2), ["/bin/claude", "probe", "10", "20"]);
}

await rm(buildDir, { force: true, recursive: true });
console.log("claude-interactive-cli-runner tests passed");
