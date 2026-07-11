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
    path.join(buildDir, "capture-markdown-format.js"),
    compile("capture-markdown-format.ts"),
    "utf8"
  );
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

  // Codex 0.144.1 embeds base instructions and tools into input items.
  const embeddedResponseCreate = extractCaptureSections({
    type: "response.create",
    model: "gpt-5.6-sol",
    input: [
      {
        type: "additional_tools",
        role: "developer",
        tools: [
          {
            type: "function",
            name: "wait",
            description: "Wait for output.\nPreserve spacing.",
          },
        ],
      },
      {
        type: "message",
        role: "developer",
        content: [
          {
            type: "input_text",
            text: "You are Codex.\n\nUse the workspace carefully.",
          },
        ],
      },
      {
        type: "message",
        role: "developer",
        content: [{ type: "input_text", text: "<skills>profile</skills>" }],
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "probe" }],
      },
    ],
  });
  assert.equal(
    embeddedResponseCreate.find((s) => s.section === "system").content[0].text,
    "You are Codex.\n\nUse the workspace carefully."
  );
  assert.equal(
    embeddedResponseCreate.find((s) => s.section === "tools").payload.length,
    1
  );
  assert.deepEqual(
    embeddedResponseCreate
      .find((s) => s.section === "messages")
      .payload.map((message) => message.role),
    ["developer", "user"]
  );

  // OpenAI chat shape: no top-level system; the system prompt is the first
  // `role: "system"` message, and the messages section keeps the array.
  const chatShape = extractCaptureSections({
    model: "vendor-model",
    messages: [
      { role: "system", content: "You are a coding CLI." },
      { role: "user", content: "probe" },
    ],
    tools: [{ function: { name: "Bash" } }],
  });
  assert.equal(
    chatShape.find((s) => s.section === "system").content,
    "You are a coding CLI."
  );
  assert.equal(chatShape.find((s) => s.section === "tools").payload.length, 1);
  assert.equal(
    chatShape.find((s) => s.section === "messages").payload.length,
    2
  );

  // Writer: fixed clock so artifact paths and content are deterministic.
  const clock = () => new Date("2026-07-02T18:00:00.000Z");
  const writer = await NativeRequestCaptureWriter.create({
    captureId: "cap-1",
    clock,
    outputDir,
    providerId: "claude",
    selectedModelId: "claude-opus-4-8",
    selectedReasoningEffort: "max",
  });
  // The selected model and Core reasoning intent are part of every filename.
  assert.match(
    writer.artifacts.jsonlPath,
    /claude-claude-opus-4-8-max-native-request\.jsonl$/u
  );
  assert.match(
    writer.artifacts.diagnosticsJsonlPath,
    /claude-claude-opus-4-8-max-native-request\.diagnostics\.jsonl$/u
  );
  assert.match(
    writer.artifacts.markdownPath,
    /claude-claude-opus-4-8-max-native-request\.md$/u
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
    providerId: "claude",
    selectedModelId: "vendor/model name:1",
    selectedReasoningEffort: "x/high",
  });
  assert.match(
    unsafeModel.artifacts.jsonlPath,
    /-claude-vendor-model-name-1-x-high-native-request\.jsonl$/u
  );

  await writer.writeCapturedRequest({
    body: {
      system: "You are Claude.\nUse readable text.",
      tools: [{ name: "Read", description: "Read a file.\nReturn text." }],
      messages: [
        {
          role: "developer",
          content: [
            { type: "text", text: "Use profile skills.\nNo JSON escapes." },
          ],
        },
        { role: "user", content: "probe" },
      ],
    },
    bodyText: '{"system":"You are Claude.\\nUse readable text."}',
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
  // Auth header never reaches disk, and the raw JSONL contains only captured
  // upstream request records.
  assert.ok(!jsonl.includes("sk-secret"));
  assert.match(
    jsonl,
    new RegExp(REDACTED_CAPTURE_HEADER_VALUE.replace(/[[\]]/gu, "\\$&"), "u")
  );
  assert.match(jsonl, /"type":"request_captured"/u);
  assert.doesNotMatch(jsonl, /"type":"capture_start"/u);
  assert.doesNotMatch(jsonl, /"section":"system"/u);
  assert.doesNotMatch(jsonl, /"type":"capture_end"/u);

  const diagnosticsJsonl = await readFile(
    writer.artifacts.diagnosticsJsonlPath,
    "utf8"
  );
  assert.match(diagnosticsJsonl, /"type":"capture_start"/u);
  assert.match(diagnosticsJsonl, /"selectedReasoningEffort":"max"/u);
  assert.match(diagnosticsJsonl, /"type":"capture_end"/u);

  const markdown = await readFile(writer.artifacts.markdownPath, "utf8");
  assert.ok(!markdown.includes("sk-secret"));
  assert.match(markdown, /# Claude Native Request Capture/u);
  assert.match(markdown, /Selected model: claude-opus-4-8/u);
  assert.match(markdown, /### 1\. System Prompt/u);
  assert.match(markdown, /### 2\. Tool Declarations/u);
  assert.match(
    markdown,
    /### 3\. Developer Context: Permissions, Skills, Plugins/u
  );
  assert.match(markdown, /You are Claude\.\nUse readable text\./u);
  assert.match(markdown, /Read a file\.\nReturn text\./u);
  assert.match(markdown, /Use profile skills\.\nNo JSON escapes\./u);
  assert.doesNotMatch(markdown, /You are Claude\\.nUse readable text/u);
  assert.match(markdown, /Sent upstream: true/u);

  const embeddedWriter = await NativeRequestCaptureWriter.create({
    captureId: "cap-codex-embedded",
    clock: () => new Date("2026-07-11T07:07:08.271Z"),
    outputDir,
    providerId: "codex",
    selectedModelId: "gpt-5.6-sol",
  });
  await embeddedWriter.writeCapturedRequest({
    body: {
      type: "response.create",
      input: [
        {
          type: "additional_tools",
          role: "developer",
          tools: [
            {
              type: "function",
              name: "wait",
              description: "Wait for output.\nPreserve spacing.",
            },
          ],
        },
        {
          type: "message",
          role: "developer",
          content: [
            {
              type: "input_text",
              text: "You are Codex.\n\nUse the workspace carefully.",
            },
          ],
        },
        {
          type: "message",
          role: "developer",
          content: [{ type: "input_text", text: "Profile skill context." }],
        },
      ],
    },
    bodyText: "captured websocket frame",
    headers: {},
    method: "WS",
    path: "/backend-api/codex/responses",
    target: "chatgpt.com:443",
    timestamp: "2026-07-11T07:07:10.421Z",
  });
  await embeddedWriter.complete("captured");
  const embeddedMarkdown = await readFile(
    embeddedWriter.artifacts.markdownPath,
    "utf8"
  );
  assert.match(
    embeddedMarkdown,
    /You are Codex\.\n\nUse the workspace carefully\./u
  );
  assert.match(embeddedMarkdown, /Wait for output\.\nPreserve spacing\./u);
  assert.match(embeddedMarkdown, /Profile skill context\./u);
  assert.doesNotMatch(embeddedMarkdown, /No system prompt field found/u);
  assert.doesNotMatch(embeddedMarkdown, /No tool declarations found/u);
  assert.doesNotMatch(embeddedMarkdown, /"type": "additional_tools"/u);
  assert.doesNotMatch(embeddedMarkdown, /You are Codex\.\\n/u);
  assert.doesNotMatch(embeddedMarkdown, /Wait for output\.\\n/u);

  // Envelope-only artifact: no HTTP request, but the applied-input envelope +
  // diagnostic context still make a complete artifact.
  const envelopeWriter = await NativeRequestCaptureWriter.create({
    captureId: "cap-envelope",
    clock,
    outputDir,
    providerId: "codex",
    selectedModelId: "gpt-5.4",
  });
  await envelopeWriter.recordAppliedInputEnvelope({
    kind: "codex",
    selectedModelId: "gpt-5.4",
    sourceLogPath: "/home/user/wire.jsonl",
  });
  await envelopeWriter.recordDiagnosticContext({
    kind: "wire_capture_note",
    payload: { promptLength: 42 },
  });
  await envelopeWriter.complete("captured");

  const envelopeJsonl = await readFile(
    envelopeWriter.artifacts.jsonlPath,
    "utf8"
  );
  assert.equal(envelopeJsonl, "");
  const envelopeDiagnosticsJsonl = await readFile(
    envelopeWriter.artifacts.diagnosticsJsonlPath,
    "utf8"
  );
  assert.match(envelopeDiagnosticsJsonl, /"type":"applied_input_envelope"/u);
  assert.match(
    envelopeDiagnosticsJsonl,
    /"type":"provider_diagnostic_context"/u
  );
  const envelopeMarkdown = await readFile(
    envelopeWriter.artifacts.markdownPath,
    "utf8"
  );
  assert.match(envelopeMarkdown, /# Codex Native Request Capture/u);
  assert.match(envelopeMarkdown, /## Applied Harness\/Profile Envelope/u);
  assert.match(envelopeMarkdown, /wire\.jsonl/u);
  assert.match(envelopeMarkdown, /wire_capture_note/u);
  assert.match(envelopeMarkdown, /No HTTP request intercepted/u);

  console.log("capture-artifacts tests: OK");
} finally {
  await rm(buildDir, { force: true, recursive: true });
  await rm(outputDir, { force: true, recursive: true });
}
