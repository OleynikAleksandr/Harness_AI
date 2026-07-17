import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-swarm-reader-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "kimi-acp-session-contracts.ts",
    "kimi-swarm-progress-reader.ts",
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
  const { readKimiSwarmAgents } = await import(
    pathToFileURL(path.join(buildDir, "kimi-swarm-progress-reader.js")).href
  );

  // Store layout mirroring the live CLI 0.26.0 session store.
  const sessionsRoot = path.join(root, "sessions");
  const agentsDir = path.join(
    sessionsRoot,
    "wd_test_0000000000",
    "session_abc",
    "agents"
  );
  for (const agent of ["main", "agent-0", "agent-1", "agent-10"]) {
    await mkdir(path.join(agentsDir, agent), { recursive: true });
  }
  const row = (value) => `${JSON.stringify(value)}\n`;
  writeFileSync(
    path.join(agentsDir, "agent-0", "wire.jsonl"),
    row({ protocol_version: "1.4", type: "metadata" }) +
      row({
        input: [
          {
            text: '<git-context status="unavailable" reason="not-a-repo"/>\n\nRead the file a.md and summarize it.',
            type: "text",
          },
        ],
        type: "turn.prompt",
      }),
    "utf8"
  );
  writeFileSync(
    path.join(agentsDir, "agent-1", "wire.jsonl"),
    row({ protocol_version: "1.4", type: "metadata" }),
    "utf8"
  );
  writeFileSync(
    path.join(agentsDir, "agent-10", "wire.jsonl"),
    row({ input: [{ text: "Task ten", type: "text" }], type: "turn.prompt" }),
    "utf8"
  );
  writeFileSync(path.join(agentsDir, "main", "wire.jsonl"), "", "utf8");

  const agents = readKimiSwarmAgents("session_abc", { sessionsRoot });
  assert.deepEqual(
    agents.map((agent) => agent.agentId),
    ["agent-0", "agent-1", "agent-10"]
  );
  assert.equal(agents[0].prompt, "Read the file a.md and summarize it.");
  assert.equal(agents[1].prompt, null);
  assert.equal(agents[2].prompt, "Task ten");

  // Unknown sessions and unreadable roots resolve to an empty snapshot.
  assert.deepEqual(
    readKimiSwarmAgents("session_missing", { sessionsRoot }),
    []
  );
  assert.deepEqual(
    readKimiSwarmAgents("session_abc", {
      sessionsRoot: path.join(root, "no-such-root"),
    }),
    []
  );

  console.log("kimi swarm progress reader tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
