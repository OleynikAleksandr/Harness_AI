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
  const spec = facade.buildTurnSpec({
    modelId: "gpt-5.6-sol",
    providerId: "codex",
    reasoningEffort: "high",
    systemPrompt: "Native Codex prompt\n\nProfile Creator instructions",
  });
  assert.equal(spec.providerId, "codex");
  assert.equal(spec.modelId, "gpt-5.6-sol");
  assert.equal(spec.reasoningEffort, "high");
  assert.deepEqual(spec.settingSources, []);
  assert.deepEqual(spec.tools, []);
  assert.equal(spec.workspaceId, "profile-studio");
  assert.equal(
    spec.workspacePath,
    path.join("/tmp/harness-profile-studio-test", "ProfileStudio", "workspace")
  );
  assert.equal(spec.workspacePath, resolveProfileStudioWorkspacePath());
  assert.equal(
    spec.systemPrompt,
    "Native Codex prompt\n\nProfile Creator instructions"
  );
  assert.doesNotMatch(spec.systemPrompt, /PROFILE CONTEXT/u);
  assert.deepEqual(spec.outputSchema.required, [
    "assistantResponse",
    "draft",
    "nextAction",
  ]);

  assert.equal(facade.getOutputSchema(), spec.outputSchema);

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
