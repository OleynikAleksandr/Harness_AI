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

const dictionaryUrl = `data:text/javascript;base64,${Buffer.from(
  compile("source-dictionaries.ts")
).toString("base64")}`;
const registrySource = compile("source-dictionary-registry.ts").replace(
  'from "./source-dictionaries.js";',
  `from "${dictionaryUrl}";`
);
const [{ APPROVED_ENGLISH_SOURCE_DICTIONARIES }, { SourceDictionaryRegistry }] =
  await Promise.all([
    import(dictionaryUrl),
    import(
      `data:text/javascript;base64,${Buffer.from(registrySource).toString("base64")}`
    ),
  ]);

assert.deepEqual(
  APPROVED_ENGLISH_SOURCE_DICTIONARIES.map((dictionary) => dictionary.category),
  [
    "ui_labels",
    "ui_helper_text",
    "messages_for_the_user",
    "artifacts_for_the_user",
  ]
);

const registry = new SourceDictionaryRegistry();
assert.equal(registry.getMessage("ui_labels", "settings.title"), "Settings");
assert.equal(
  registry.getMessage("ui_labels", "session.subagents.launched"),
  "Subagents launched"
);
assert.equal(
  registry.getMessage("ui_labels", "sidebar.regenerateSessionTitle"),
  "Regenerate title"
);
assert.equal(
  registry.getMessage("ui_helper_text", "session.subagent.readOnly"),
  "Read-only live subagent session"
);
assert.equal(
  registry.getMessage(
    "messages_for_the_user",
    "session.subagent.parentUnavailable"
  ),
  "Parent session unavailable"
);
assert.equal(
  registry.getMessage("messages_for_the_user", "core.bridge.unavailable"),
  "Core runtime bridge is unavailable."
);
assert.match(
  registry.getMessage(
    "ui_helper_text",
    "settings.provider.kimiClient.apiKey.description"
  ),
  /Kimi Code Console/u
);
assert.equal(
  registry.getMessage("ui_labels", "settings.provider.kimiClient.defaultModel"),
  "Kimi Default model"
);
assert.match(
  registry.getMessage(
    "ui_helper_text",
    "settings.provider.kimiClient.defaultModel.description"
  ),
  /new sessions/u
);
assert.match(
  registry.getMessage(
    "ui_helper_text",
    "settings.provider.glmClient.apiKey.description"
  ),
  /Z\.ai Coding Plan/u
);
assert.match(
  registry.getMessage(
    "ui_helper_text",
    "settings.provider.glmClient.model.glm-5.2.description"
  ),
  /Z\.ai Coding Plan/u
);

// Project workflow UI strings (New/Open Project, Project Doctor, status strip).
assert.equal(
  registry.getMessage("ui_labels", "sidebar.openProject"),
  "Open Project"
);
assert.equal(
  registry.getMessage("ui_labels", "workflow.autopilot.reason.no-progress"),
  "No progress"
);
assert.equal(
  registry.getMessage(
    "ui_labels",
    "workflow.autopilot.reason.waiting-for-executors"
  ),
  "Waiting for executors"
);
assert.equal(
  registry.getMessage(
    "ui_labels",
    "workflow.autopilot.reason.waiting-for-mode-choice"
  ),
  "Waiting for the execution mode choice"
);
assert.equal(
  registry.getMessage("ui_labels", "workflow.autopilot.reason.paused"),
  "Paused"
);
// The plan pause button replaces the status strip autopilot switch.
assert.equal(registry.getMessage("ui_labels", "workflow.plan.pause"), "Pause");
assert.equal(
  registry.getMessage("ui_labels", "workflow.plan.pausing"),
  "Pausing after the current task"
);
assert.equal(
  registry.getMessage("ui_labels", "workflow.plan.continue"),
  "Continue"
);
for (const [category, messageId] of [
  ["ui_labels", "workflow.strip.autopilot"],
  ["ui_helper_text", "workflow.strip.autopilot.description"],
]) {
  assert.equal(
    registry.getMessage(category, messageId),
    null,
    `${category}/${messageId} is no longer used`
  );
}
assert.match(
  registry.getMessage("ui_helper_text", "project.state.GIT_NO_KIT"),
  /Workflow Kit/u
);
assert.equal(
  registry.getMessage("messages_for_the_user", "project.setup.nameRequired"),
  "Enter a project name."
);

// Execution mode card, plan panel, sidebar role and git identity strings
// pass through the same category dictionaries as every other UI string.
for (const [category, messageId] of [
  ["ui_labels", "workflow.modeCard.question"],
  ["ui_labels", "workflow.modeCard.choose"],
  ["ui_labels", "workflow.modeCard.recommended"],
  ["ui_labels", "workflow.modeCard.option.sequential"],
  ["ui_labels", "workflow.modeCard.option.orchestrated"],
  ["ui_labels", "workflow.modeCard.option.refine"],
  ["ui_helper_text", "workflow.modeCard.option.refine.description"],
  ["ui_helper_text", "workflow.modeCard.hint"],
  ["messages_for_the_user", "workflow.modeCard.saving"],
  ["ui_labels", "workflow.plan.title"],
  ["ui_labels", "workflow.plan.taskStatus.IN_PROGRESS"],
  ["ui_helper_text", "workflow.plan.openExecutor"],
  ["ui_labels", "sidebar.role.agent"],
  ["ui_labels", "sidebar.role.orchestrator"],
  ["ui_labels", "project.identity.save"],
  ["ui_helper_text", "project.identity.description"],
]) {
  assert.equal(
    typeof registry.getMessage(category, messageId),
    "string",
    `${category}/${messageId} must be an approved source string`
  );
}
