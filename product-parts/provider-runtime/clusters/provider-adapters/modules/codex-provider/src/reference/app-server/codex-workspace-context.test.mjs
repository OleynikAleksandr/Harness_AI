import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./codex-workspace-context.ts", import.meta.url),
  "utf8"
);
const facadeSource = readFileSync(
  new URL("./codex-app-server-facade.ts", import.meta.url),
  "utf8"
);
const processSource = readFileSync(
  new URL("./process/codex-app-server-process.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { buildCodexWorkspaceContextParams, CODEX_HOST_RECOVERY_ENV } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );

assert.deepEqual(CODEX_HOST_RECOVERY_ENV, {
  HARNESS_WORKFLOW_RECOVERY: "host",
});
assert.deepEqual(
  buildCodexWorkspaceContextParams({ workspaceContext: "# Workflow\nT1" }),
  { developerInstructions: "# Workflow\nT1" }
);
assert.deepEqual(buildCodexWorkspaceContextParams(), {});
assert.deepEqual(
  buildCodexWorkspaceContextParams({ workspaceContext: " " }),
  {}
);
assert.deepEqual(
  buildCodexWorkspaceContextParams({ profileKind: "native" }),
  {}
);

// thread/start and thread/resume both carry the context next to the
// profile params; the app-server process gets the host recovery flag.
assert.equal(
  facadeSource.match(
    /\.\.\.buildCodexThreadProfileParams\(profileState\),\s*\.\.\.buildCodexWorkspaceContextParams\(startOptions\),/gu
  )?.length,
  2
);
assert.match(processSource, /\.\.\.CODEX_HOST_RECOVERY_ENV,\s*CODEX_HOME/u);
