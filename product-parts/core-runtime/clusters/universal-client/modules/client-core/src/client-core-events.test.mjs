import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function compile(file, url) {
  return ts.transpileModule(readFileSync(new URL(file, url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

const buildDir = await mkdtemp(path.join(tmpdir(), "client-core-events-"));

try {
  // Both imports are type-only and erase, so the transpiled module is standalone.
  writeFileSync(
    path.join(buildDir, "client-core-events.js"),
    compile("./client-core-events.ts", import.meta.url),
    "utf8"
  );
  const { mapClientTurnEvent } = await import(
    pathToFileURL(path.join(buildDir, "client-core-events.js")).href
  );

  // turn_started / turn_completed pass through as turn events.
  assert.equal(
    mapClientTurnEvent({ kind: "turn_started" }).type,
    "turn_started"
  );
  assert.equal(
    mapClientTurnEvent({ kind: "turn_completed" }).type,
    "turn_completed"
  );

  // Streamed content becomes a live assistant dialog message.
  const live = mapClientTurnEvent({ kind: "assistant_delta", text: "hi" });
  assert.equal(live.type, "dialog_message");
  assert.equal(live.role, "assistant");
  assert.equal(live.content, "hi");
  assert.equal(live.tag, "live");

  // Thinking uses the thinking tag.
  assert.equal(
    mapClientTurnEvent({ kind: "thinking_delta", text: "why" }).tag,
    "thinking"
  );

  // Empty deltas map to null (nothing to render).
  assert.equal(mapClientTurnEvent({ kind: "assistant_delta", text: "" }), null);

  // turn_failed carries the error message.
  const failed = mapClientTurnEvent({
    error: "network",
    kind: "turn_failed",
    text: "boom",
  });
  assert.equal(failed.type, "turn_failed");
  assert.equal(failed.message, "boom");

  console.log("client-core-events tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
