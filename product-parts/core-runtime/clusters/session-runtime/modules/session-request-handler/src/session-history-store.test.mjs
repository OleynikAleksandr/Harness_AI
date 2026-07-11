import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-history-store.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { readWorkspaceSessionIndex } = await import(moduleUrl);

const workspacePath = mkdtempSync(join(tmpdir(), "harness-session-index-"));
const indexDirectory = join(workspacePath, ".harness", "sessions");
mkdirSync(indexDirectory, { recursive: true });
const base = {
  createdAt: "2026-07-11T00:00:00.000Z",
  model: "gpt-5.6-sol",
  nextSessionMode: { invocationMode: "native", requestMode: "raw" },
  providerId: "codex",
  providerName: "Codex",
  title: "Session",
  updatedAt: "2026-07-11T00:00:00.000Z",
  workspaceId: "workspace-test",
  workspacePath,
};
writeFileSync(
  join(indexDirectory, "index.json"),
  JSON.stringify([
    { ...base, id: "legacy-root" },
    {
      ...base,
      id: "child-valid",
      parentSessionId: "legacy-root",
      sessionKind: "subagent",
      subagentStatus: "running",
      titleOrigin: "auto",
    },
    {
      ...base,
      id: "child-invalid",
      sessionKind: "subagent",
      subagentStatus: "running",
    },
  ]),
  "utf8"
);

const restored = readWorkspaceSessionIndex(workspacePath);
assert.deepEqual(
  restored.map((session) => session.id),
  ["legacy-root", "child-valid"]
);
assert.equal(restored[0].sessionKind, "primary");
assert.equal(restored[0].titleOrigin, "default");
assert.equal(restored[1].parentSessionId, "legacy-root");
assert.equal(restored[1].subagentStatus, "running");

rmSync(workspacePath, { force: true, recursive: true });
