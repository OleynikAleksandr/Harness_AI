import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./codex-profile-application.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { buildCodexThreadProfileParams, computeCodexProfileDetails } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );

const managedState = {
  kind: "managed",
  payload: {
    contentHash: "codex-studio-hash",
    profileId: "planning-documents",
    profileName: "Planning Documents",
    prompt: "Reduced Codex Native foundation.\n\nCustom additions.",
    toolingCategories: {},
  },
};
assert.deepEqual(buildCodexThreadProfileParams(managedState), {
  baseInstructions: "Reduced Codex Native foundation.\n\nCustom additions.",
});
assert.deepEqual(buildCodexThreadProfileParams({ kind: "native" }), {});

const details = computeCodexProfileDetails(managedState, "default-process");
assert.equal(details.systemPrompt, "baseInstructions full-replacement");
assert.equal(details.toolMode, "provider-fixed");
assert.equal(details.processProfileKey, "default-process");
assert.match(details.tooling, /no per-thread control/u);

console.log("codex profile application tests: OK");
