import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

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

const loggerSource = compile("settings-store-logger.ts");
const { logCoreSettingsSnapshot } = await import(
  `data:text/javascript;base64,${Buffer.from(loggerSource).toString("base64")}`
);

const tempDirectory = await mkdtemp(path.join(tmpdir(), "harness-logs-"));
const previousHome = process.env.HARNESS_AI_HOME;

try {
  process.env.HARNESS_AI_HOME = tempDirectory;
  logCoreSettingsSnapshot("settings.get", "/tmp/project");

  assert.equal(existsSync(path.join(tempDirectory, "logs", "core")), true);
  assert.equal(existsSync(path.join(tempDirectory, "logs", "interface")), true);
  assert.equal(existsSync(path.join(tempDirectory, "logs", "providers")), true);

  const logPath = path.join(
    tempDirectory,
    "logs",
    "core",
    "settings-store.jsonl"
  );
  const [line] = readFileSync(logPath, "utf8").trim().split("\n");
  const entry = JSON.parse(line);
  assert.equal(entry.event, "settings.get");
  assert.equal(entry.workspacePath, "/tmp/project");
  assert.equal(typeof entry.timestamp, "string");
} finally {
  if (previousHome === undefined) {
    process.env.HARNESS_AI_HOME = undefined;
  } else {
    process.env.HARNESS_AI_HOME = previousHome;
  }
  await rm(tempDirectory, { force: true, recursive: true });
}
