import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function compileToUrl(source) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const workspaceRegistryUrl = compileToUrl(
  read(
    "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.ts"
  )
);
const sessionRegistryUrl = compileToUrl(
  read("../../session-registry/src/session-registry-facade.ts")
);
// The telemetry factory is a provider-runtime concern; a pass-through stub
// keeps this test on the snapshot shape.
const telemetryUrl = compileToUrl(
  "export const usageContextTelemetryFacade = { createTelemetry: (value) => value };"
);
const projectorUrl = compileToUrl(
  read("./session-snapshot-projector-facade.ts")
    .replace(
      /"[^"]*usage-context-telemetry-facade\.js"/u,
      JSON.stringify(telemetryUrl)
    )
    .replace(
      /"[^"]*workspace-registry-facade\.js"/u,
      JSON.stringify(workspaceRegistryUrl)
    )
    .replace(
      /"[^"]*session-registry-facade\.js"/u,
      JSON.stringify(sessionRegistryUrl)
    )
);
const [{ workspaceRegistryFacade }, { SessionSnapshotProjectorFacade }] =
  await Promise.all([import(workspaceRegistryUrl), import(projectorUrl)]);
const projector = new SessionSnapshotProjectorFacade();

// No active project: the snapshot has no stand-in workspace and no sessions.
const empty = projector.getSnapshot();
assert.equal(empty.workspace, null);
assert.deepEqual(empty.sessions, []);
assert.equal(empty.activeSessionId, "");

// An active project is the snapshot workspace as Core registered it.
const added = workspaceRegistryFacade.addWorkspace("/tmp/projector-project");
workspaceRegistryFacade.selectWorkspace(added.id);
assert.deepEqual(projector.getSnapshot().workspace, added);

// Removing the last project leaves the snapshot without a workspace again.
workspaceRegistryFacade.removeWorkspace(added.id);
assert.equal(projector.getSnapshot().workspace, null);
console.log("session-snapshot-projector tests passed");
