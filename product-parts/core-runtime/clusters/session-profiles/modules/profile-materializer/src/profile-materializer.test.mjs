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
    customInstructionsPath: "/tmp/p/custom-instructions.md",
    inputPrefixPath: "/tmp/p/input-prefix.json",
    passportPath: "/tmp/p/profile.yaml",
    profileDirectory: "/tmp/p",
    promptPath: "/tmp/p/system-prompt.md",
    requestTemplatePath: "/tmp/p/request-template.json",
    toolingPath: "/tmp/p/tooling.yaml",
    toolsPath: "/tmp/p/tools.json",
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

const nativeProfile = {
  ...profile,
  id: "codex-synthetic-native-custom",
  nativeRequest: {
    customInstructions: "Custom rule one.\nCustom rule two.\n",
    requestTemplate: {
      reasoning: { summary: "detailed" },
      type: "response.create",
    },
    inputPrefix: [
      {
        content: [{ text: "Developer prefix.", type: "input_text" }],
        role: "developer",
        type: "message",
      },
    ],
    tools: [
      {
        description: "Read a file.",
        name: "read_file",
        parameters: { type: "object" },
        type: "function",
      },
    ],
  },
  passport: {
    description: "Codex native plus custom.",
    name: "Codex Synthetic Native + Custom",
    provider: "codex",
  },
  promptBody: "You are Codex.\n\n# General\n\nBase native rules.\n",
};

const nativePayload = materializer.materialize(nativeProfile, {
  sessionStartDate: startDate,
  workspaceInstructions: "Workspace text must not be appended.",
  workspacePath: "/work/space",
});

assert.equal(nativePayload.profileId, "codex-synthetic-native-custom");
assert.equal(nativePayload.inputPrefix.length, 1);
assert.equal(nativePayload.inputPrefix[0].role, "developer");
assert.equal(nativePayload.requestTemplate.type, "response.create");
assert.equal(nativePayload.tools.length, 1);
assert.equal(nativePayload.tools[0].name, "read_file");
assert.ok(!nativePayload.prompt.includes("# Harness Session Context"));
assert.ok(!nativePayload.prompt.includes("# Workspace AGENTS.md"));
assert.ok(
  !nativePayload.prompt.includes("Workspace text must not be appended.")
);
assert.match(nativePayload.prompt, /# General\n\nCustom rule one\./u);
assert.ok(
  nativePayload.prompt.indexOf("Custom rule two.") <
    nativePayload.prompt.indexOf("Base native rules.")
);

const studioProfile = {
  ...profile,
  customInstructionsBody: "Keep only planning-document instructions.\n",
  id: "draft-planning",
  nativeRequest: {
    tools: [{ name: "Read" }, { name: "Glob" }],
  },
  passport: {
    authoring: "profile-studio",
    creatorSessionId: "session-studio-1",
    description: "Planning workflow.",
    model: "opus",
    name: "Planning Documents",
    nativeCaptureDonor: {
      artifactPath: "/captures/claude-opus.jsonl",
      captureId: "capture-1",
      modelId: "opus",
      providerId: "claude",
      requestHash: "sha256-request",
    },
    provider: "claude",
    purpose: "Create planning documents",
    schemaVersion: 2,
    status: "valid",
  },
  promptBody: "Reduced native planning foundation.\n",
};

const studioPayload = materializer.materialize(studioProfile, {
  artifactLanguage: "ru",
  chatLanguage: "ru",
  sessionStartDate: startDate,
  workspaceInstructions: "This AGENTS text must never be appended.",
  workspacePath: "/user/workspace",
});

assert.equal(
  studioPayload.prompt,
  "Reduced native planning foundation.\n\nKeep only planning-document instructions."
);
assert.ok(!studioPayload.prompt.includes("# Harness Session Context"));
assert.ok(!studioPayload.prompt.includes("AGENTS"));
assert.deepEqual(studioPayload.tools, [{ name: "Read" }, { name: "Glob" }]);

// Studio hashes ignore session wrapper context but cover both parts, tools,
// exact target and donor provenance.
const studioDifferentContext = materializer.materialize(studioProfile, {
  sessionStartDate: new Date("2030-01-01T00:00:00Z"),
  workspaceInstructions: "Different ambient instructions.",
  workspacePath: "/different/workspace",
});
assert.equal(studioDifferentContext.contentHash, studioPayload.contentHash);
const studioEditedCustom = materializer.materialize(
  {
    ...studioProfile,
    customInstructionsBody: "Changed custom instructions.\n",
  },
  { sessionStartDate: startDate }
);
assert.notEqual(studioEditedCustom.contentHash, studioPayload.contentHash);
const studioEditedTools = materializer.materialize(
  { ...studioProfile, nativeRequest: { tools: [{ name: "Read" }] } },
  { sessionStartDate: startDate }
);
assert.notEqual(studioEditedTools.contentHash, studioPayload.contentHash);
const studioEditedDonor = materializer.materialize(
  {
    ...studioProfile,
    passport: {
      ...studioProfile.passport,
      nativeCaptureDonor: {
        ...studioProfile.passport.nativeCaptureDonor,
        requestHash: "sha256-other-request",
      },
    },
  },
  { sessionStartDate: startDate }
);
assert.notEqual(studioEditedDonor.contentHash, studioPayload.contentHash);

console.log("profile-materializer tests: OK");
