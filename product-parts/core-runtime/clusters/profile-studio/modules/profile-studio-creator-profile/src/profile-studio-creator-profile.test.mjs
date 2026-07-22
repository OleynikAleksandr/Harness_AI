import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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

const { ProfileStudioCreatorProfileFacade, resolveCreatorAgentProfilePath } =
  await import(
    `data:text/javascript;base64,${Buffer.from(
      compile("profile-studio-creator-profile-facade.ts")
    ).toString("base64")}`
  );

const previousHarnessHome = process.env.HARNESS_AI_HOME;
const harnessHome = mkdtempSync(
  path.join(tmpdir(), "harness-creator-profile-")
);
process.env.HARNESS_AI_HOME = harnessHome;

try {
  const profilePath = resolveCreatorAgentProfilePath("codex");
  mkdirSync(profilePath, { recursive: true });
  writeFileSync(path.join(profilePath, "system-prompt.md"), "Native prompt\n");
  writeFileSync(
    path.join(profilePath, "custom-instructions.md"),
    "Creator workflow\n"
  );
  writeFileSync(
    path.join(profilePath, "tools.json"),
    JSON.stringify([{ name: "exec", type: "custom" }])
  );
  writeFileSync(
    path.join(profilePath, "initial-user-message.md"),
    [
      "Provider: {{targetProviderId}}",
      "Model: {{targetModelId}}",
      "Reasoning: {{targetReasoning}}",
      "Profile: {{profileId}}",
      "Capture: {{captureId}}",
      "Raw: {{rawCapturePath}}",
      "SHA: {{rawCaptureSha256}}",
    ].join("\n")
  );

  const facade = new ProfileStudioCreatorProfileFacade();
  const profile = await facade.load("codex");
  assert.equal(profile.providerId, "codex");
  assert.equal(
    profile.effectiveSystemPrompt,
    "Native prompt\n\nCreator workflow"
  );
  assert.deepEqual(profile.toolDeclarations, [
    { name: "exec", type: "custom" },
  ]);
  assert.equal(profile.directoryPath, profilePath);

  const localizedPrompt = facade.composeEffectiveSystemPrompt(profile, "ru");
  assert.match(localizedPrompt, /User communication language/u);
  assert.match(localizedPrompt, /in Russian \(ru\)/u);
  assert.match(localizedPrompt, /first user-role assignment/u);
  assert.match(
    facade.composeEffectiveSystemPrompt(profile, ""),
    /in English \(en\)/u
  );

  const message = facade.renderInitialUserMessage(profile, {
    captureId: "capture-1",
    profileId: "draft-1",
    rawCapturePath: "/captures/raw.jsonl",
    rawCaptureSha256: "abc123",
    targetModelId: "opus",
    targetProviderId: "claude",
    targetReasoning: "high",
  });
  assert.match(message, /Provider: claude/u);
  assert.match(message, /Raw: \/captures\/raw\.jsonl/u);
  assert.doesNotMatch(message, /\{\{/u);

  writeFileSync(path.join(profilePath, "tools.json"), "not-json");
  await assert.rejects(
    () => facade.load("codex"),
    /tools\.json must contain valid JSON/u
  );

  writeFileSync(
    path.join(profilePath, "tools.json"),
    JSON.stringify([{ name: "exec" }])
  );
  writeFileSync(
    path.join(profilePath, "initial-user-message.md"),
    "Unknown: {{unsupported}}"
  );
  await assert.rejects(() => facade.load("codex"), /unsupported placeholder/u);

  console.log("profile-studio-creator-profile tests: OK");
} finally {
  rmSync(harnessHome, { force: true, recursive: true });
  if (previousHarnessHome === undefined) {
    process.env.HARNESS_AI_HOME = undefined;
  } else {
    process.env.HARNESS_AI_HOME = previousHarnessHome;
  }
}
