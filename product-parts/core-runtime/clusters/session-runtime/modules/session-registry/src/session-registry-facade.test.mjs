import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-registry-facade.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { SessionRegistryFacade } = await import(moduleUrl);

// No bootstrap session: no workspace (the old built-in one included) has a
// registry session, and there is no active session.
const registry = new SessionRegistryFacade();
assert.deepEqual(registry.getSessions("harness-ai-local"), []);
assert.deepEqual(registry.getSessions("workspace-any"), []);
assert.equal(registry.getActiveSessionId(), "");
console.log("session-registry tests passed");
