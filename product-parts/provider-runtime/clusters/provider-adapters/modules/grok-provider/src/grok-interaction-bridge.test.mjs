import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "grok-interaction-bridge-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "grok-acp-contracts.ts",
    "grok-interaction-bridge.ts",
  ]) {
    const source = readFileSync(new URL(filename, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      compiled,
      "utf8"
    );
  }
  const { GrokInteractionBridge } = await import(
    pathToFileURL(path.join(buildDir, "grok-interaction-bridge.js")).href
  );

  const events = [];
  const bridge = new GrokInteractionBridge({
    emit: (event) => events.push(event),
    timeoutMs: 100,
  });
  const permission = bridge.handle({
    id: 7,
    method: "session/request_permission",
    params: {
      options: [
        { kind: "allow_once", name: "Allow once", optionId: "allow-once" },
        { kind: "reject_once", name: "Reject", optionId: "reject-once" },
      ],
      sessionId: "s1",
      toolCall: {
        rawInput: { secret: "must not escape" },
        title: "Run tests",
        toolCallId: "tc-1",
      },
    },
  });
  const permissionEvent = events.at(-1);
  assert.equal(permissionEvent.kind, "permission");
  assert.equal(permissionEvent.message, "Run tests");
  assert.equal(JSON.stringify(permissionEvent).includes("secret"), false);
  bridge.respond({
    interactionId: permissionEvent.interactionId,
    optionId: "allow-once",
    outcome: "selected",
  });
  assert.deepEqual(await permission, {
    outcome: { optionId: "allow-once", outcome: "selected" },
  });

  const question = bridge.handle({
    id: "question-1",
    method: "_x.ai/ask_user_question",
    params: {
      questions: [
        {
          multiSelect: false,
          options: [{ description: "Fast", label: "SQLite" }],
          question: "Which database?",
        },
      ],
      sessionId: "s1",
      toolCallId: "tc-2",
    },
  });
  const questionEvent = events.at(-1);
  assert.equal(questionEvent.questions[0].id, "Which database?");
  bridge.respond({
    answers: { "Which database?": ["SQLite"] },
    interactionId: questionEvent.interactionId,
    outcome: "answered",
  });
  assert.deepEqual(await question, {
    answers: { "Which database?": ["SQLite"] },
    outcome: "accepted",
  });

  const plan = bridge.handle({
    id: 8,
    method: "x.ai/exit_plan_mode",
    params: { planContent: "# Plan", toolCallId: "tc-3" },
  });
  const planEvent = events.at(-1);
  assert.equal(planEvent.plan, "# Plan");
  bridge.respond({
    feedback: "Add tests",
    interactionId: planEvent.interactionId,
    outcome: "cancelled",
  });
  assert.deepEqual(await plan, {
    feedback: "Add tests",
    outcome: "cancelled",
  });

  const timeoutEvents = [];
  const timeoutBridge = new GrokInteractionBridge({
    emit: (event) => timeoutEvents.push(event),
    timeoutMs: 5,
  });
  const timedOut = timeoutBridge.handle({
    id: 9,
    method: "session/request_permission",
    params: {},
  });
  assert.deepEqual(await timedOut, { outcome: { outcome: "cancelled" } });
  assert.equal(timeoutEvents.at(-1).reason, "timed_out");
  await assert.rejects(
    timeoutBridge.handle({ id: 10, method: "x.ai/arbitrary", params: {} }),
    /Unsupported Grok reverse request/u
  );

  console.log("grok interaction bridge tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
