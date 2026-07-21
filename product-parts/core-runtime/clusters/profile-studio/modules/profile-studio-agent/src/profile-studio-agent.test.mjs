import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
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

const { ProfileStudioAgentFacade, resolveProfileStudioWorkspacePath } =
  await import(
    `data:text/javascript;base64,${Buffer.from(
      compile("profile-studio-agent-facade.ts")
    ).toString("base64")}`
  );

const previousHarnessHome = process.env.HARNESS_AI_HOME;
process.env.HARNESS_AI_HOME = "/tmp/harness-profile-studio-test";

try {
  const facade = new ProfileStudioAgentFacade();
  const context = {
    currentDraft: {
      customInstructions: "Current custom instructions.",
      description: "Planning workflow",
      donorReference: { artifactPath: "/captures/claude-opus.jsonl" },
      name: "Planning Documents",
      purpose: "Prepare planning evidence",
      systemPrompt: "Current reduced foundation.",
      toolSelection: {
        mode: "claude-subset",
        tools: [{ name: "Read" }],
      },
    },
    donorContent: {
      system: "Full native donor prompt",
      tools: [{ name: "Read" }, { name: "Bash" }],
    },
    profileId: "draft-1",
    target: { modelId: "opus", providerId: "claude" },
  };
  const spec = facade.buildTurnSpec(context);
  assert.equal(spec.providerId, "claude");
  assert.equal(spec.modelId, "opus");
  assert.equal(spec.reasoningEffort, "high");
  assert.deepEqual(spec.settingSources, []);
  assert.deepEqual(spec.tools, []);
  assert.equal(spec.workspaceId, "profile-studio");
  assert.equal(
    spec.workspacePath,
    path.join("/tmp/harness-profile-studio-test", "ProfileStudio", "workspace")
  );
  assert.equal(spec.workspacePath, resolveProfileStudioWorkspacePath());
  assert.match(spec.systemPrompt, /PROFILE CONTEXT/u);
  assert.match(spec.systemPrompt, /Full native donor prompt/u);
  assert.match(spec.systemPrompt, /never a\s+patch/u);
  assert.match(spec.systemPrompt, /Never mark a\s+profile Valid/u);
  assert.deepEqual(spec.outputSchema.required, [
    "assistantResponse",
    "draft",
    "nextAction",
  ]);

  const codexSpec = facade.buildTurnSpec({
    ...context,
    target: { modelId: "gpt-5.6-sol", providerId: "codex" },
  });
  assert.equal(codexSpec.providerId, "codex");
  assert.equal(codexSpec.modelId, "gpt-5.6-sol");
  assert.equal(codexSpec.reasoningEffort, "high");

  const kimiSpec = facade.buildTurnSpec({
    ...context,
    target: { modelId: "k3", providerId: "kimi-client" },
  });
  assert.equal(kimiSpec.providerId, "kimi-client");
  assert.equal(kimiSpec.modelId, "k3");
  assert.equal(kimiSpec.reasoningEffort, undefined);

  const validResult = facade.parseTurnResult({
    assistantResponse: "I reduced the donor and added planning rules.",
    draft: {
      customInstructions: "Create a decision-ready planning document.",
      description: "Planning workflow",
      donorReference: { artifactPath: "/captures/claude-opus.jsonl" },
      name: "Planning Documents",
      purpose: "Prepare planning evidence",
      systemPrompt: "Reduced native planning foundation.",
      toolSelection: {
        mode: "claude-subset",
        tools: [{ name: "Read" }],
      },
    },
    nextAction: "request-approval",
  });
  assert.equal(validResult.ok, true);
  assert.equal(validResult.result.draft.name, "Planning Documents");
  assert.equal(validResult.result.nextAction, "request-approval");

  const discussionOnly = facade.parseTurnResult({
    assistantResponse: "Which planning artifacts should the profile create?",
    draft: null,
    nextAction: "continue",
  });
  assert.equal(discussionOnly.ok, true);
  assert.equal(discussionOnly.result.draft, null);

  const incomplete = facade.parseTurnResult({
    assistantResponse: "Incomplete",
    draft: { name: "Only a name" },
    nextAction: "continue",
  });
  assert.equal(incomplete.ok, false);
  assert.match(incomplete.error, /complete full snapshot/u);

  const invalidToolShape = facade.parseTurnResult({
    assistantResponse: "Invalid tools",
    draft: {
      customInstructions: "Custom",
      description: "Description",
      donorReference: null,
      name: "Name",
      purpose: "Purpose",
      systemPrompt: "Prompt",
      toolSelection: { mode: "codex-fixed", tools: [] },
    },
    nextAction: "continue",
  });
  assert.equal(invalidToolShape.ok, false);

  console.log("profile-studio-agent tests: OK");
} finally {
  if (previousHarnessHome === undefined) {
    process.env.HARNESS_AI_HOME = undefined;
  } else {
    process.env.HARNESS_AI_HOME = previousHarnessHome;
  }
}
