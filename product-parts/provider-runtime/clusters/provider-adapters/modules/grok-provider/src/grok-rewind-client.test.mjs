import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "grok-rewind-"));
try {
  for (const filename of ["grok-acp-contracts.ts", "grok-rewind-client.ts"]) {
    const output = ts.transpileModule(
      readFileSync(new URL(filename, import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      }
    ).outputText;
    await mkdir(root, { recursive: true });
    writeFileSync(`${root}/${filename.replace(/\.ts$/u, ".js")}`, output);
  }
  const { GrokRewindClient } = await import(
    pathToFileURL(path.join(root, "grok-rewind-client.js")).href
  );
  const calls = [];
  const client = new GrokRewindClient({
    request(method, params) {
      calls.push({ method, params });
      if (method.endsWith("/points")) {
        return Promise.resolve({
          result: {
            rewind_points: [0, 1, 2, 3].map((prompt_index) => ({
              prompt_index,
            })),
          },
        });
      }
      return Promise.resolve({ result: { success: true } });
    },
  });
  assert.deepEqual(await client.rollbackTurns("session-1", 2), {
    providerSessionId: "session-1",
    turns: 2,
  });
  assert.deepEqual(calls[1], {
    method: "_x.ai/rewind/execute",
    params: {
      force: false,
      mode: "conversation_only",
      sessionId: "session-1",
      targetPromptIndex: 2,
    },
  });
  await assert.rejects(
    client.rollbackTurns("session-1", 5),
    /cannot rollback/u
  );
  await assert.rejects(
    client.rollbackTurns("session-1", 0),
    /positive integer/u
  );
  console.log("grok-rewind-client tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
