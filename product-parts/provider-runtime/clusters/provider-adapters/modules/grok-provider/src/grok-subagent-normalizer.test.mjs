import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "grok-subagents-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "grok-acp-contracts.ts",
    "grok-subagent-normalizer.ts",
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
  const { GrokSubagentNormalizer } = await import(
    pathToFileURL(path.join(buildDir, "grok-subagent-normalizer.js")).href
  );
  const normalizer = new GrokSubagentNormalizer();

  const spawn = normalizer.normalizeNotification({
    method: "x.ai/session_notification",
    params: {
      _meta: { timestamp: "2026-07-16T10:00:00.000Z" },
      sessionId: "parent-1",
      update: {
        child_session_id: "child-1",
        description: "Inspect provider events",
        model: "grok-4.5",
        parent_prompt_id: "prompt-1",
        parent_session_id: "parent-1",
        persona: "Scout",
        role: "researcher",
        sessionUpdate: "subagent_spawned",
        subagent_id: "subagent-1",
        subagent_type: "explore",
      },
    },
  });
  assert.equal(spawn.length, 2);
  assert.deepEqual(
    spawn.map(({ event, targetProviderSessionId }) => ({
      callId: event.callId,
      targetProviderSessionId,
      type: event.type,
    })),
    [
      {
        callId: "prompt-1",
        targetProviderSessionId: "parent-1",
        type: "subagent_control",
      },
      {
        callId: undefined,
        targetProviderSessionId: "parent-1",
        type: "subagent_session",
      },
    ]
  );
  assert.equal(spawn[0].event.model, "grok-4.5");
  assert.equal(spawn[1].event.agentNickname, "Scout");
  assert.equal(spawn[1].event.agentRole, "researcher");

  const progress = normalizer.normalizeNotification({
    method: "_x.ai/session_notification",
    params: {
      sessionId: "parent-1",
      update: {
        child_session_id: "child-1",
        context_usage_pct: 20,
        parent_session_id: "parent-1",
        sessionUpdate: "subagent_progress",
        subagent_id: "subagent-1",
        tokens_used: 40_000,
      },
    },
  });
  assert.equal(progress.length, 1);
  assert.equal(progress[0].targetProviderSessionId, "child-1");
  assert.equal(progress[0].event.status, "running");

  const finished = normalizer.normalizeNotification({
    method: "x.ai/session_notification",
    params: {
      sessionId: "parent-1",
      update: {
        child_session_id: "child-1",
        error: "Parent cancelled the task",
        sessionUpdate: "subagent_finished",
        status: "cancelled",
        subagent_id: "subagent-1",
      },
    },
  });
  assert.equal(finished.length, 2);
  assert.equal(finished[0].targetProviderSessionId, "child-1");
  assert.equal(finished[0].event.status, "interrupted");
  assert.equal(finished[1].targetProviderSessionId, "parent-1");
  assert.equal(finished[1].event.lifecycleStatus, "failed");
  assert.equal(
    finished[1].event.agentStates[0].message,
    "Parent cancelled the task"
  );

  const recovered = new GrokSubagentNormalizer().normalizeRunningResponse(
    {
      result: {
        subagents: [
          {
            childSessionId: "child-live",
            description: "Continue indexing",
            parentSessionId: "parent-live",
            status: "running",
            subagentId: "subagent-live",
            subagentType: "general-purpose",
          },
        ],
      },
    },
    "parent-live"
  );
  assert.deepEqual(
    recovered.map(({ event, targetProviderSessionId }) => [
      event.type,
      targetProviderSessionId,
    ]),
    [
      ["subagent_control", "parent-live"],
      ["subagent_session", "parent-live"],
      ["subagent_status", "child-live"],
    ]
  );

  assert.deepEqual(
    normalizer.normalizeNotification({ method: "session/update", params: {} }),
    []
  );
  console.log("grok-subagent-normalizer tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
