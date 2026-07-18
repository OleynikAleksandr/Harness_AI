import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-usage-reader-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "kimi-acp-session-contracts.ts",
    "kimi-session-usage-reader.ts",
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
  const { parseKimiWireUsage, readKimiSessionTokenUsage } = await import(
    pathToFileURL(path.join(buildDir, "kimi-session-usage-reader.js")).href
  );

  // Rows replayed from the live CLI 0.26.0 session store.
  const wire = [
    '{"type":"llm.request","model":"kimi-for-coding"}',
    '{"type":"context.append_loop_event","event":{"type":"step.end","usage":{"inputOther":90,"output":10,"inputCacheRead":1000,"inputCacheCreation":0}}}',
    "not-json",
    '{"type":"usage.record","model":"kimi-for-coding","usage":{"inputOther":127,"output":14,"inputCacheRead":20094,"inputCacheCreation":0},"usageScope":"turn"}',
  ].join("\n");
  assert.deepEqual(parseKimiWireUsage(wire), {
    cached: 20_094,
    limit: 262_144,
    used: 127 + 14 + 20_094,
  });
  assert.equal(parseKimiWireUsage('{"type":"llm.request"}'), null);
  assert.equal(parseKimiWireUsage(""), null);

  // The caller passes the session model's window (k3 is a 1M-context
  // model); the K2.7 value stays the no-argument fallback.
  assert.equal(parseKimiWireUsage(wire, 1_048_576).limit, 1_048_576);

  // Reader locates sessions/<wd_*>/<acpSessionId>/agents/main/wire.jsonl.
  const sessionsRoot = path.join(root, "sessions");
  const acpSessionId = "session_test-1234";
  const mainDir = path.join(
    sessionsRoot,
    "wd_example_abc",
    acpSessionId,
    "agents",
    "main"
  );
  await mkdir(mainDir, { recursive: true });
  await writeFile(path.join(mainDir, "wire.jsonl"), wire, "utf8");
  assert.deepEqual(readKimiSessionTokenUsage(acpSessionId, { sessionsRoot }), {
    cached: 20_094,
    limit: 262_144,
    used: 20_235,
  });
  assert.equal(
    readKimiSessionTokenUsage("session_absent", { sessionsRoot }),
    null
  );
  assert.equal(
    readKimiSessionTokenUsage(acpSessionId, {
      sessionsRoot: path.join(root, "missing"),
    }),
    null
  );

  console.log("kimi session usage reader tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
