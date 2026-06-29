import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./provider-readiness-registry-facade.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { ProviderReadinessRegistryFacade } = await import(moduleUrl);

const registry = new ProviderReadinessRegistryFacade();
const changes = [];
const unsubscribe = registry.subscribe((change) => changes.push(change));

assert.deepEqual(registry.combine("codex", "workspace-a"), {
  readinessStatus: "checking",
});

registry.setLiveness("codex", "ready");
assert.deepEqual(registry.combine("codex", "workspace-a"), {
  readinessStatus: "preparing",
});

registry.setProvisioning("codex", "workspace-a", "ready");
assert.deepEqual(registry.combine("codex", "workspace-a"), {
  readinessStatus: "ready",
});

registry.setProvisioning("codex", "workspace-b", "failed", "Missing auth");
assert.deepEqual(registry.combine("codex", "workspace-b"), {
  readinessMessage: "Missing auth",
  readinessStatus: "failed",
});

registry.setLiveness("codex", "failed", "CLI login required");
assert.deepEqual(registry.combine("codex", "workspace-a"), {
  readinessMessage: "CLI login required",
  readinessStatus: "failed",
});

assert.deepEqual(
  changes.map((change) => change.scope),
  ["liveness", "provisioning", "provisioning", "liveness"]
);

registry.setLiveness("codex", "failed", "CLI login required");
assert.equal(changes.length, 4);

unsubscribe();
registry.setLiveness("codex", "ready");
assert.equal(changes.length, 4);
