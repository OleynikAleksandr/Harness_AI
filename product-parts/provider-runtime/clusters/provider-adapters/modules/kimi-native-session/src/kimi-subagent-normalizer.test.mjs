import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-subagent-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "kimi-acp-session-contracts.ts",
    "kimi-subagent-normalizer.ts",
    "kimi-session-event-normalizer.ts",
  ]) {
    const source = readFileSync(
      new URL(`./${filename}`, import.meta.url),
      "utf8"
    );
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
  const { KimiSubagentNormalizer } = await import(
    pathToFileURL(path.join(buildDir, "kimi-subagent-normalizer.js")).href
  );
  const { KimiSessionEventNormalizer } = await import(
    pathToFileURL(path.join(buildDir, "kimi-session-event-normalizer.js")).href
  );

  // Sequence replayed from the live CLI 0.26.0 probe (2026-07-17).
  const toolCallId = "0:tool_NN6plkdzkgdBXe2H61kTRvQI";
  const normalizer = new KimiSubagentNormalizer();
  normalizer.bindParentSession("kimi-native-parent-1");

  const spawn = normalizer.normalizeToolUpdate({
    sessionUpdate: "tool_call",
    status: "pending",
    title: "Agent",
    toolCallId,
  });
  assert.equal(spawn.length, 2);
  assert.equal(spawn[0].type, "subagent_control");
  assert.equal(spawn[0].action, "spawn");
  assert.equal(spawn[0].callId, toolCallId);
  assert.equal(spawn[0].senderProviderSessionId, "kimi-native-parent-1");
  assert.deepEqual(spawn[0].receiverProviderSessionIds, [
    `kimi-agent-${toolCallId}`,
  ]);
  assert.equal(spawn[1].type, "subagent_session");
  assert.equal(spawn[1].parentProviderSessionId, "kimi-native-parent-1");
  assert.equal(spawn[1].status, "running");

  // Streaming input chunks produce nothing until rawInput settles.
  assert.deepEqual(
    normalizer.normalizeToolUpdate({
      content: [{ content: { text: '{"description' }, type: "content" }],
      sessionUpdate: "tool_call_update",
      status: "in_progress",
      toolCallId,
    }),
    []
  );
  const taskUpdate = normalizer.normalizeToolUpdate({
    rawInput: {
      description: "Reply with DONE",
      prompt: "Reply with the single word DONE and nothing else.",
    },
    sessionUpdate: "tool_call_update",
    status: "in_progress",
    title: "Launching coder agent: Reply with DONE",
    toolCallId,
  });
  assert.equal(taskUpdate.length, 1);
  assert.equal(taskUpdate[0].type, "subagent_session");
  assert.equal(taskUpdate[0].task, "Reply with DONE");

  const terminal = normalizer.normalizeToolUpdate({
    content: [
      {
        content: {
          text: "agent_id: agent-0\nactual_subagent_type: coder\nstatus: completed\n\n[summary]\nDONE",
          type: "text",
        },
        type: "content",
      },
    ],
    sessionUpdate: "tool_call_update",
    status: "completed",
    toolCallId,
  });
  assert.equal(terminal.length, 2);
  assert.equal(terminal[0].type, "subagent_session");
  assert.equal(terminal[0].agentRole, "coder");
  assert.equal(terminal[0].status, "completed");
  assert.equal(terminal[1].type, "subagent_status");
  assert.equal(terminal[1].status, "completed");
  assert.equal(terminal[1].providerSessionId, `kimi-agent-${toolCallId}`);

  // Nothing after the terminal update; ordinary tools never synthesize.
  assert.deepEqual(
    normalizer.normalizeToolUpdate({
      sessionUpdate: "tool_call_update",
      status: "completed",
      toolCallId,
    }),
    []
  );
  assert.deepEqual(
    normalizer.normalizeToolUpdate({
      sessionUpdate: "tool_call",
      status: "pending",
      title: "Read",
      toolCallId: "0:tool_other",
    }),
    []
  );

  // A failed result maps to a failed lifecycle.
  const failing = new KimiSubagentNormalizer();
  failing.bindParentSession("kimi-native-parent-2");
  failing.normalizeToolUpdate({
    sessionUpdate: "tool_call",
    status: "pending",
    title: "AgentSwarm",
    toolCallId: "swarm-1",
  });
  const failed = failing.normalizeToolUpdate({
    sessionUpdate: "tool_call_update",
    status: "failed",
    toolCallId: "swarm-1",
  });
  assert.equal(failed.at(-1).status, "failed");

  // AgentSwarm sequence replayed from the 2026-07-17 headless probe: the
  // input streams as partial-JSON content chunks (rawInput stays null), and
  // the terminal update carries per-agent <subagent> sections.
  const swarm = new KimiSubagentNormalizer();
  swarm.bindParentSession("kimi-native-parent-4");
  const swarmSpawn = swarm.normalizeToolUpdate({
    sessionUpdate: "tool_call",
    status: "pending",
    title: "AgentSwarm",
    toolCallId: "swarm-9",
  });
  assert.equal(swarmSpawn.length, 2);
  assert.deepEqual(swarmSpawn[0].receiverProviderSessionIds, [
    "kimi-agent-swarm-9",
  ]);
  assert.deepEqual(
    swarm.normalizeToolUpdate({
      content: [
        {
          content: {
            text: '{"description": "Read files in parallel", "items": ["a.md",',
            type: "text",
          },
          type: "content",
        },
      ],
      sessionUpdate: "tool_call_update",
      status: "in_progress",
      toolCallId: "swarm-9",
    }),
    []
  );
  const parsedTask = swarm.normalizeToolUpdate({
    content: [
      {
        content: {
          text: ' "b.md"], "prompt_template": "Read {{item}}", "subagent_type": "explore"}',
          type: "text",
        },
        type: "content",
      },
    ],
    sessionUpdate: "tool_call_update",
    status: "in_progress",
    toolCallId: "swarm-9",
  });
  assert.equal(parsedTask.length, 1);
  assert.equal(parsedTask[0].type, "subagent_session");
  assert.equal(parsedTask[0].task, "Read files in parallel (2 agents)");
  const swarmTerminal = swarm.normalizeToolUpdate({
    content: [
      {
        content: {
          text: '<agent_swarm_result>\n<summary>completed: 1, aborted: 1</summary>\n<subagent agent_id="agent-0" item="a.md" outcome="completed">Alpha summary</subagent>\n<subagent agent_id="agent-1" item="b.md" outcome="aborted">stopped early</subagent>\n</agent_swarm_result>',
          type: "text",
        },
        type: "content",
      },
    ],
    sessionUpdate: "tool_call_update",
    status: "completed",
    toolCallId: "swarm-9",
  });
  const agentSpawns = swarmTerminal.filter(
    (event) => event.type === "subagent_control"
  );
  assert.deepEqual(
    agentSpawns.map((event) => event.receiverProviderSessionIds[0]),
    ["kimi-agent-swarm-9:agent-0", "kimi-agent-swarm-9:agent-1"]
  );
  assert.equal(agentSpawns[0].prompt, "Read files in parallel (2 agents)");
  const terminalStatuses = new Map(
    swarmTerminal
      .filter((event) => event.type === "subagent_status")
      .map((event) => [event.providerSessionId, event.status])
  );
  assert.equal(terminalStatuses.get("kimi-agent-swarm-9:agent-0"), "completed");
  assert.equal(
    terminalStatuses.get("kimi-agent-swarm-9:agent-1"),
    "interrupted"
  );
  assert.equal(terminalStatuses.get("kimi-agent-swarm-9"), "completed");
  const agentZeroSessions = swarmTerminal.filter(
    (event) =>
      event.type === "subagent_session" &&
      event.providerSessionId === "kimi-agent-swarm-9:agent-0"
  );
  assert.equal(agentZeroSessions[0].agentRole, "explore");
  assert.equal(agentZeroSessions[0].task, "a.md");

  // Integration: the session event normalizer interleaves subagent events
  // with the ordinary tool stream events.
  const events = new KimiSessionEventNormalizer();
  events.bindParentSession("kimi-native-parent-3");
  const mixed = events.normalizeNotification({
    method: "session/update",
    params: {
      sessionId: "s",
      update: {
        sessionUpdate: "tool_call",
        status: "pending",
        title: "Agent",
        toolCallId: "call-9",
      },
    },
  });
  assert.deepEqual(
    mixed.map((event) => event.type),
    ["subagent_control", "subagent_session", "stream_event"]
  );

  console.log("kimi subagent normalizer tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
