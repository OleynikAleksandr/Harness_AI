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

const buildDir = await mkdtemp(path.join(tmpdir(), "kimi-client-provider-"));

try {
  // The only import is a type import (client-contract), which erases.
  writeFileSync(
    path.join(buildDir, "kimi-client-provider-facade.js"),
    compile("./kimi-client-provider-facade.ts", import.meta.url),
    "utf8"
  );
  const { KIMI_DIALECT, KIMI_MODEL, buildKimiTurnRequest } = await import(
    pathToFileURL(path.join(buildDir, "kimi-client-provider-facade.js")).href
  );

  // Kimi dialect points at the subscription coding endpoint with reasoning_content.
  assert.equal(KIMI_DIALECT.baseUrl, "https://api.kimi.com/coding/v1");
  assert.equal(KIMI_DIALECT.thinkingForm, "reasoning_content");
  assert.equal(KIMI_MODEL, "kimi-for-coding");

  // The request builder defaults the model and carries the dialect + key.
  const request = buildKimiTurnRequest({
    apiKey: "sk-test",
    messages: [{ content: "hi", role: "user" }],
    tools: [],
  });
  assert.equal(request.model, "kimi-for-coding");
  assert.equal(request.apiKey, "sk-test");
  assert.equal(request.dialect.providerId, "kimi");
  assert.equal(request.signal, undefined);

  // An explicit model overrides the default.
  assert.equal(
    buildKimiTurnRequest({
      apiKey: "k",
      messages: [],
      model: "kimi-custom",
      tools: [],
    }).model,
    "kimi-custom"
  );

  console.log("kimi-client-provider tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
