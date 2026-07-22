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

const { ProfileStudioReadModelFacade } = await import(
  `data:text/javascript;base64,${Buffer.from(
    compile("profile-studio-read-model-facade.ts")
  ).toString("base64")}`
);

const providerDescriptor = {
  getCapturableModels(providerId) {
    return providerId === "claude"
      ? [
          { id: "sonnet", label: "Sonnet" },
          { id: "opus", label: "Opus" },
        ]
      : [
          { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
          { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
        ];
  },
  getClientModels(providerId) {
    return providerId === "kimi-client" ? [{ id: "k3", label: "K3" }] : [];
  },
};

const profileCatalog = {
  listStudioProfilesForTarget(request) {
    return Promise.resolve([
      {
        creatorSessionId: "session-creator-1",
        description: "Planning workflow",
        id: `draft-${request.providerId}-${request.modelId}`,
        model: request.modelId,
        name: "Planning Documents",
        provider: request.providerId,
        purpose: "Prepare planning evidence",
        status: "draft",
      },
    ]);
  },
};

function createReadModel(providerId, modelId, tools = [], hasDonor = true) {
  const nativeCaptureDonor = hasDonor
    ? {
        artifactPath: "/captures/native.jsonl",
        captureId: "capture-1",
        modelId,
        providerId,
        requestHash: "sha256-request",
      }
    : null;
  const passport = {
    authoring: "profile-studio",
    creatorSessionId: "session-creator-1",
    description: "Planning workflow",
    model: modelId,
    name: "Planning Documents",
    nativeCaptureDonor,
    provider: providerId,
    purpose: "Prepare planning evidence",
    schemaVersion: 2,
    status: "draft",
  };
  const storedProfile = {
    customInstructionsBody: "Custom planning instructions.\n",
    documents: {},
    id: "draft-1",
    nativeRequest: tools.length > 0 ? { tools } : undefined,
    passport,
    promptBody: "Reduced native foundation.\n",
    scope: "individual",
    tooling: { categories: {} },
  };
  const profileLifecycle = {
    getProfile() {
      return Promise.resolve({
        ok: true,
        profile: {
          approvedAt: null,
          approvedContentHash: null,
          contentHash: "content-hash",
          createdAt: "2026-07-20T00:00:00.000Z",
          creatorSessionId: passport.creatorSessionId,
          description: passport.description,
          lifecycleStatus: "draft",
          name: passport.name,
          nativeCaptureDonor: passport.nativeCaptureDonor,
          profileId: "draft-1",
          purpose: passport.purpose,
          target: { modelId, providerId },
          updatedAt: "2026-07-20T00:00:00.000Z",
        },
      });
    },
  };
  return new ProfileStudioReadModelFacade({
    profileCatalog,
    profileLifecycle,
    profileMaterializer: {
      materialize() {
        return { prompt: "Compiled prompt." };
      },
    },
    profileStore: {
      loadProfile() {
        return Promise.resolve({ ok: true, profile: storedProfile });
      },
    },
    providerDescriptor,
    universalToolSource: {
      list() {
        return Array.from({ length: 9 }, (_, index) => ({
          name: `tool-${index + 1}`,
        }));
      },
    },
  });
}

const claudeReadModel = createReadModel("claude", "opus", [
  { name: "Read" },
  { name: "Glob" },
]);
const targets = claudeReadModel.listTargets();
assert.deepEqual(
  targets.map((provider) => [
    provider.id,
    provider.models.map((model) => model.id),
  ]),
  [
    ["claude", ["sonnet", "opus"]],
    ["codex", ["gpt-5.6-sol", "gpt-5.6-terra"]],
    ["kimi-client", ["k3"]],
  ]
);

const rows = await claudeReadModel.listProfilesForTarget({
  modelId: "opus",
  providerId: "claude",
});
assert.equal(rows.length, 1);
assert.equal(rows[0].creatorSessionId, "session-creator-1");
assert.equal(rows[0].status, "draft");

const claudeInspector = await claudeReadModel.getInspector("draft-1");
assert.equal(claudeInspector.ok, true);
assert.equal(claudeInspector.snapshot.overview.canApprove, true);
assert.match(claudeInspector.snapshot.overview.donorLabel, /capture-1/u);
assert.equal(
  claudeInspector.snapshot.prompt.nativeFoundation,
  "Reduced native foundation.\n"
);
assert.equal(
  claudeInspector.snapshot.prompt.compiledSystemPrompt,
  "Compiled prompt."
);
assert.equal(claudeInspector.snapshot.tools.mode, "subset");
assert.equal(claudeInspector.snapshot.tools.editable, true);
assert.deepEqual(claudeInspector.snapshot.tools.selectedTools, [
  { name: "Read" },
  { name: "Glob" },
]);

const claudeWithoutDonor = await createReadModel(
  "claude",
  "opus",
  [{ name: "Read" }],
  false
).getInspector("draft-1");
assert.equal(claudeWithoutDonor.ok, true);
assert.equal(claudeWithoutDonor.snapshot.overview.canApprove, false);

const codexInspector = await createReadModel("codex", "gpt-5.6-sol", [
  { name: "exec" },
  { name: "wait" },
]).getInspector("draft-1");
assert.equal(codexInspector.ok, true);
assert.equal(codexInspector.snapshot.tools.mode, "fixed");
assert.equal(codexInspector.snapshot.tools.editable, false);
assert.match(
  codexInspector.snapshot.tools.providerCeiling,
  /Declarative-only inventory/u
);
assert.deepEqual(codexInspector.snapshot.tools.selectedTools, [
  { name: "exec" },
  { name: "wait" },
]);

const kimiInspector = await createReadModel("kimi-client", "k3", [
  { name: "ReadFile" },
]).getInspector("draft-1");
assert.equal(kimiInspector.ok, true);
assert.equal(kimiInspector.snapshot.overview.canApprove, false);
assert.equal(kimiInspector.snapshot.tools.mode, "candidate-draft-only");
assert.match(kimiInspector.snapshot.tools.blockReason, /9\/25/u);
assert.equal(kimiInspector.snapshot.tools.providerCeiling, "9/25 executors");

console.log("profile-studio-read-model tests: OK");
