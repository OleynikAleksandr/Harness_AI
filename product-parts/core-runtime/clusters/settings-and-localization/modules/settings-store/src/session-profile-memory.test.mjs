import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const buildRoot = path.join(process.cwd(), ".harness", "runtime");
await mkdir(buildRoot, { recursive: true });
const buildDirectory = await mkdtemp(
  path.join(buildRoot, "session-profile-memory-test-")
);
const memoryDirectory = await mkdtemp(
  path.join(tmpdir(), "harness-profile-memory-")
);

try {
  await writeFile(
    path.join(buildDirectory, "session-profile-memory.js"),
    ts.transpileModule(
      readFileSync(
        new URL("./session-profile-memory.ts", import.meta.url),
        "utf8"
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      }
    ).outputText,
    "utf8"
  );
  const {
    readSessionProfileMemory,
    rememberAutoNormalizerFlag,
    rememberLastSelectedProfile,
  } = await import(
    pathToFileURL(path.join(buildDirectory, "session-profile-memory.js")).href
  );

  const memoryFile = path.join(memoryDirectory, "session-profile-memory.json");

  // Missing/corrupt file reads as empty memory.
  assert.deepEqual(await readSessionProfileMemory(memoryFile), {
    autoNormalizerByProvider: {},
    lastSelectedProfileByProvider: {},
  });
  await writeFile(memoryFile, "not json", "utf8");
  assert.deepEqual(await readSessionProfileMemory(memoryFile), {
    autoNormalizerByProvider: {},
    lastSelectedProfileByProvider: {},
  });

  // Per-provider last selection and AutoNormalizer flags round-trip.
  await rememberLastSelectedProfile("claude", "review", memoryFile);
  await rememberLastSelectedProfile("kimi", "native", memoryFile);
  await rememberAutoNormalizerFlag("claude", true, memoryFile);
  const memory = await readSessionProfileMemory(memoryFile);
  assert.equal(memory.lastSelectedProfileByProvider.claude, "review");
  assert.equal(memory.lastSelectedProfileByProvider.kimi, "native");
  assert.equal(memory.autoNormalizerByProvider.claude, true);

  // Overwrites replace only the provider's own entry.
  await rememberLastSelectedProfile("claude", "plan-document", memoryFile);
  const updated = await readSessionProfileMemory(memoryFile);
  assert.equal(updated.lastSelectedProfileByProvider.claude, "plan-document");
  assert.equal(updated.lastSelectedProfileByProvider.kimi, "native");

  console.log("session-profile-memory tests: OK");
} finally {
  await rm(buildDirectory, { force: true, recursive: true });
  await rm(memoryDirectory, { force: true, recursive: true });
}
