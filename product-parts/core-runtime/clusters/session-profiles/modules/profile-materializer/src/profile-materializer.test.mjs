import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const { ProfileMaterializerFacade } = await import(
  `data:text/javascript;base64,${Buffer.from(
    compile("profile-materializer-facade.ts")
  ).toString("base64")}`
);

const profile = {
  documents: {
    passportPath: "/tmp/p/profile.yaml",
    profileDirectory: "/tmp/p",
    promptPath: "/tmp/p/system-prompt.md",
    toolingPath: "/tmp/p/tooling.yaml",
  },
  id: "review",
  passport: { description: "Review things.", name: "Review" },
  promptBody: "# Review\n\nReview the change set.\n",
  scope: "universal",
  tooling: {
    categories: {
      "file-read": true,
      "file-write": false,
      git: true,
      shell: true,
      tests: true,
      web: true,
    },
  },
};

const materializer = new ProfileMaterializerFacade();
const startDate = new Date("2026-07-02T10:00:00Z");

const payload = materializer.materialize(profile, {
  artifactLanguage: "ru",
  chatLanguage: "ru",
  sessionStartDate: startDate,
  workspaceInstructions: "Follow the workspace rules.",
  workspacePath: "/work/space",
});

assert.equal(payload.profileId, "review");
assert.equal(payload.profileName, "Review");
assert.ok(payload.prompt.startsWith("# Review\n\nReview the change set."));
assert.match(payload.prompt, /# Harness Session Context/u);
assert.match(payload.prompt, /Workspace path: \/work\/space/u);
assert.match(
  payload.prompt,
  new RegExp(`Session start date: ${startDate.toDateString()}`, "u")
);
assert.match(payload.prompt, /Chat language: ru/u);
assert.match(payload.prompt, /Artifact language: ru/u);
assert.match(payload.prompt, /# Workspace AGENTS\.md/u);
assert.match(payload.prompt, /Follow the workspace rules\./u);
assert.equal(payload.toolingCategories["file-write"], false);
assert.equal(payload.toolingCategories.web, true);

// Optional wrapper parts are omitted when absent.
const minimal = materializer.materialize(profile, {
  sessionStartDate: startDate,
});
assert.ok(!minimal.prompt.includes("Workspace path:"));
assert.ok(!minimal.prompt.includes("Chat language:"));
assert.ok(!minimal.prompt.includes("# Workspace AGENTS.md"));

// The content hash is stable for identical input and changes with content.
const repeat = materializer.materialize(profile, {
  artifactLanguage: "ru",
  chatLanguage: "ru",
  sessionStartDate: startDate,
  workspaceInstructions: "Follow the workspace rules.",
  workspacePath: "/work/space",
});
assert.equal(repeat.contentHash, payload.contentHash);
const edited = materializer.materialize(
  { ...profile, promptBody: "# Review v2\n" },
  {
    artifactLanguage: "ru",
    chatLanguage: "ru",
    sessionStartDate: startDate,
    workspaceInstructions: "Follow the workspace rules.",
    workspacePath: "/work/space",
  }
);
assert.notEqual(edited.contentHash, payload.contentHash);

console.log("profile-materializer tests: OK");
