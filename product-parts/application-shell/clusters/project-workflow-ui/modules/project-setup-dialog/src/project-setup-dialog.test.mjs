import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const dialogSource = readFileSync(
  new URL("./project-setup-dialog-facade.tsx", import.meta.url),
  "utf8"
);
const actionsSource = readFileSync(
  new URL("./project-setup-actions.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(actionsSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { asksProjectName, offersOpenWithoutKit, primarySetupButton } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );

// The primary button follows the Core inspect action.
assert.equal(primarySetupButton("install").messageId, "project.setup.install");
assert.equal(
  primarySetupButton("install-migrate").messageId,
  "project.setup.install"
);
assert.equal(primarySetupButton("update").messageId, "project.setup.update");
assert.equal(primarySetupButton("open").messageId, "project.setup.open");
assert.equal(primarySetupButton("doctor").messageId, "project.setup.open");
assert.equal(primarySetupButton("unsupported"), null);
assert.equal(primarySetupButton("create"), null);
for (const action of ["install", "install-migrate", "update", "unsupported"]) {
  assert.equal(offersOpenWithoutKit(action), true);
}
for (const action of ["open", "doctor", "create"]) {
  assert.equal(offersOpenWithoutKit(action), false);
}
assert.equal(asksProjectName("new", null), true);
assert.equal(asksProjectName("open", "install"), true);
assert.equal(asksProjectName("open", "open"), false);

// Core does the work: pick, inspect and prepare go through the bridge;
// the dialog never touches the filesystem or native dialogs.
assert.match(dialogSource, /window\.harnessCore\?\.pickProjectParent\(\)/u);
assert.match(dialogSource, /window\.harnessCore\?\.pickProjectFolder\(\)/u);
assert.match(dialogSource, /window\.harnessCore\?\.inspectProjectFolder\(/u);
assert.match(dialogSource, /window\.harnessCore\?\.prepareProject\(/u);
assert.match(dialogSource, /install: false/u);
assert.match(dialogSource, /onPrepared\(result\.workspace\)/u);
assert.match(dialogSource, /role="dialog"/u);
assert.match(dialogSource, /aria-modal="true"/u);
assert.match(dialogSource, /role="alert"/u);
assert.match(dialogSource, /`project\.state\.\$\{inspect\.state\}`/u);
assert.match(dialogSource, /"project\.state\.nested"/u);
assert.doesNotMatch(dialogSource, /window\.(?:alert|confirm|prompt)/u);
assert.doesNotMatch(dialogSource, /node:fs|readdir|existsSync/u);

console.log("project-setup-dialog tests: OK");
