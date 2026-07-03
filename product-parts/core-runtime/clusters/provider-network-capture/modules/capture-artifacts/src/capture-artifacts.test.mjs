import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
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

const buildDir = await mkdtemp(path.join(tmpdir(), "capture-artifacts-"));
const outputDir = await mkdtemp(path.join(tmpdir(), "capture-out-"));

try {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    path.join(buildDir, "capture-artifacts-facade.js"),
    compile("capture-artifacts-facade.ts"),
    "utf8"
  );
  const {
    NativeRequestCaptureWriter,
    redactCaptureHeaders,
    extractCaptureSections,
    REDACTED_CAPTURE_HEADER_VALUE,
  } = await import(
    pathToFileURL(path.join(buildDir, "capture-artifacts-facade.js")).href
  );

  // Redaction: credential-bearing headers are masked, plain ones survive.
  const redacted = redactCaptureHeaders({
    authorization: "Bearer sk-secret",
    "x-api-key": "abc",
    "chatgpt-account-id": "91968ff3-47b4-4231-81b8-8c07e18e5a04",
    "content-type": "application/json",
    "x-stainless-os": "MacOS",
  });
  assert.equal(redacted.authorization, REDACTED_CAPTURE_HEADER_VALUE);
  assert.equal(redacted["x-api-key"], REDACTED_CAPTURE_HEADER_VALUE);
  assert.equal(redacted["chatgpt-account-id"], REDACTED_CAPTURE_HEADER_VALUE);
  assert.equal(redacted["content-type"], "application/json");
  assert.equal(redacted["x-stainless-os"], "MacOS");

  // Section extraction covers both Anthropic and OpenAI/Codex field names.
  const anthropic = extractCaptureSections({
    system: "SYS",
    tools: [{ name: "Read" }],
    messages: [{ role: "user" }],
  });
  assert.equal(anthropic.find((s) => s.section === "system").content, "SYS");
  assert.equal(anthropic.find((s) => s.section === "tools").payload.length, 1);
  const codex = extractCaptureSections({
    instructions: "CODEX SYS",
    input: [{ role: "user" }],
  });
  assert.equal(codex.find((s) => s.section === "system").content, "CODEX SYS");
  assert.equal(codex.find((s) => s.section === "messages").payload.length, 1);

  // The Codex WebSocket `response.create` frame extracts a full pair: the
  // `type` field is ignored, instructions/tools/input map to the sections.
  const responseCreate = extractCaptureSections({
    type: "response.create",
    model: "gpt-5.5",
    instructions: "You are Codex.",
    tools: [{ name: "shell" }, { name: "apply_patch" }],
    input: [{ type: "text", text: "hi" }],
  });
  assert.equal(
    responseCreate.find((s) => s.section === "system").content,
    "You are Codex."
  );
  assert.equal(
    responseCreate.find((s) => s.section === "tools").payload.length,
    2
  );
  assert.equal(
    responseCreate.find((s) => s.section === "messages").payload.length,
    1
  );

  // Writer: fixed clock so artifact paths and content are deterministic.
  const clock = () => new Date("2026-07-02T18:00:00.000Z");
  const writer = await NativeRequestCaptureWriter.create({
    captureId: "cap-1",
    clock,
    outputDir,
    providerId: "claude",
    selectedModelId: "claude-opus-4-8",
  });
  // The selected model id is part of the filename so dumps are distinguishable.
  assert.match(
    writer.artifacts.jsonlPath,
    /claude-claude-opus-4-8-native-request\.jsonl$/u
  );
  assert.match(
    writer.artifacts.markdownPath,
    /claude-claude-opus-4-8-native-request\.md$/u
  );

  // No selected model: the filename has no model segment.
  const noModel = await NativeRequestCaptureWriter.create({
    captureId: "cap-nomodel",
    clock: () => new Date("2026-07-02T18:00:01.000Z"),
    outputDir,
    providerId: "codex",
    selectedModelId: null,
  });
  assert.match(noModel.artifacts.jsonlPath, /-codex-native-request\.jsonl$/u);
  // Unsafe characters in the model id are sanitized to filename-safe chars.
  const unsafeModel = await NativeRequestCaptureWriter.create({
    captureId: "cap-unsafe",
    clock: () => new Date("2026-07-02T18:00:02.000Z"),
    outputDir,
    providerId: "kimi",
    selectedModelId: "vendor/model name:1",
  });
  assert.match(
    unsafeModel.artifacts.jsonlPath,
    /-kimi-vendor-model-name-1-native-request\.jsonl$/u
  );

  await writer.writeCapturedRequest({
    body: {
      system: "You are Claude.",
      tools: [{ name: "Read" }],
      messages: [],
    },
    bodyText: '{"system":"You are Claude."}',
    headers: {
      authorization: "Bearer sk-secret",
      "content-type": "application/json",
    },
    method: "POST",
    path: "/v1/messages",
    target: "api.anthropic.com:443",
    timestamp: "2026-07-02T18:00:00.000Z",
  });
  await writer.complete("captured");

  const jsonl = await readFile(writer.artifacts.jsonlPath, "utf8");
  // Auth header never reaches disk, and the system section is extracted.
  assert.ok(!jsonl.includes("sk-secret"));
  assert.match(
    jsonl,
    new RegExp(REDACTED_CAPTURE_HEADER_VALUE.replace(/[[\]]/gu, "\\$&"), "u")
  );
  assert.match(jsonl, /"type":"capture_start"/u);
  assert.match(jsonl, /"type":"request_captured"/u);
  assert.match(jsonl, /"section":"system"/u);
  assert.match(jsonl, /"type":"capture_end"/u);

  const markdown = await readFile(writer.artifacts.markdownPath, "utf8");
  assert.ok(!markdown.includes("sk-secret"));
  assert.match(markdown, /# Claude Native Request Capture/u);
  assert.match(markdown, /Selected model: claude-opus-4-8/u);
  assert.match(markdown, /You are Claude\./u);
  assert.match(markdown, /Sent upstream: true/u);

  // Kimi wire-only: no HTTP request, but envelope + diagnostic context make a
  // complete artifact.
  const kimiWriter = await NativeRequestCaptureWriter.create({
    captureId: "cap-kimi",
    clock,
    outputDir,
    providerId: "kimi",
    selectedModelId: "kimi-k2.7-code",
  });
  await kimiWriter.recordAppliedInputEnvelope({
    kind: "kimi",
    wireJsonlPath: "/home/kimi/wire.jsonl",
    selectedModelId: "kimi-k2.7-code",
  });
  await kimiWriter.recordDiagnosticContext({
    kind: "kimi_wire_capture",
    payload: { promptLength: 42 },
  });
  await kimiWriter.complete("captured");

  const kimiJsonl = await readFile(kimiWriter.artifacts.jsonlPath, "utf8");
  assert.match(kimiJsonl, /"type":"applied_input_envelope"/u);
  assert.match(kimiJsonl, /"type":"provider_diagnostic_context"/u);
  const kimiMarkdown = await readFile(
    kimiWriter.artifacts.markdownPath,
    "utf8"
  );
  assert.match(kimiMarkdown, /# Kimi Native Request Capture/u);
  assert.match(kimiMarkdown, /## Applied Input Envelope/u);
  assert.match(kimiMarkdown, /wire\.jsonl/u);
  assert.match(kimiMarkdown, /kimi_wire_capture/u);
  assert.match(kimiMarkdown, /No HTTP request intercepted/u);

  console.log("capture-artifacts tests: OK");
} finally {
  await rm(buildDir, { force: true, recursive: true });
  await rm(outputDir, { force: true, recursive: true });
}
