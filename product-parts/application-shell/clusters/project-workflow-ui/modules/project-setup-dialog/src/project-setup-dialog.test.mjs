import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const dialogSource = readFileSync(
  new URL("./project-setup-dialog-facade.tsx", import.meta.url),
  "utf8"
);
const formSource = readFileSync(
  new URL("./git-identity-form.tsx", import.meta.url),
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
const {
  asksProjectName,
  failureText,
  needsGitIdentity,
  offersOpenWithoutKit,
  primarySetupButton,
} = await import(
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
// Only New Project asks for a name; an opened folder names the project.
assert.equal(asksProjectName("new"), true);
assert.equal(asksProjectName("open"), false);
assert.match(
  dialogSource,
  /asksProjectName\(mode\) \? \{ name: projectName \}/u
);

// Failures: the next action is added once, never repeated.
assert.equal(
  failureText({ message: "Broken.", nextAction: "Run the doctor." }),
  "Broken.\nRun the doctor."
);
assert.equal(
  failureText({
    message: "Broken. Run the doctor.",
    nextAction: "Run the doctor.",
  }),
  "Broken. Run the doctor."
);
assert.equal(failureText({ message: "Broken.", nextAction: null }), "Broken.");

// GIT_IDENTITY_REQUIRED opens the identity form instead of the raw error;
// after saving, the same preparation runs again.
assert.equal(needsGitIdentity({ code: "GIT_IDENTITY_REQUIRED" }), true);
assert.equal(needsGitIdentity({ code: "GIT_IDENTITY_INVALID" }), false);
assert.match(
  dialogSource,
  /needsGitIdentity\(result\)\) \{\s*setIdentityRetry\(install\);/u
);
assert.match(
  dialogSource,
  /<GitIdentityForm onSaved=\{continueAfterIdentity\} \/>/u
);
assert.match(
  dialogSource,
  /const install = identityRetry \?\? true;\s*setIdentityRetry\(null\);\s*prepare\(install\)/u
);
assert.match(
  dialogSource,
  /export \{ GitIdentityForm \} from "\.\/git-identity-form\.js";/u
);

// The form sends name and email to Core; the Kit validates; a refusal shows
// only its message under the fields.
assert.match(
  formSource,
  /window\.harnessCore\?\.setGitIdentity\(\{ email, name \}\)/u
);
assert.match(formSource, /result\.ok\) \{\s*onSaved\(\);/u);
assert.match(formSource, /setError\(result\.message\);/u);
assert.doesNotMatch(formSource, /nextAction/u);
assert.doesNotMatch(formSource, /type="email"/u);
for (const id of [
  "project.identity.description",
  "project.identity.name",
  "project.identity.email",
  "project.identity.save",
]) {
  assert.match(formSource, new RegExp(`"${id.replaceAll(".", "\\.")}"`, "u"));
}
assert.match(formSource, /"Save and continue"/u);
assert.match(formSource, /role="alert"/u);
assert.doesNotMatch(formSource, /window\.(?:alert|confirm|prompt)/u);

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
