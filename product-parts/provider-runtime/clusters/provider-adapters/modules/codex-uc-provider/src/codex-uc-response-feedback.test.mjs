import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./codex-uc-response-feedback.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const buildDir = await mkdtemp(path.join(tmpdir(), "codex-uc-feedback-"));

function sse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const responseText =
  sse("response.created", {
    response: {
      id: "response-1",
      model: "gpt-5.5",
      reasoning: { effort: "xhigh", summary: "concise" },
      status: "in_progress",
    },
  }) +
  sse("response.output_text.delta", { delta: "ok" }) +
  sse("response.completed", {
    response: {
      id: "response-1",
      model: "gpt-5.5",
      reasoning: { effort: "xhigh", summary: "concise" },
      status: "completed",
      usage: { input_tokens: 12 },
    },
  });

try {
  writeFileSync(path.join(buildDir, "codex-uc-response-feedback.js"), compiled);
  const { extractCodexUcResponseFeedback, recordCodexUcResponseFeedback } =
    await import(
      pathToFileURL(path.join(buildDir, "codex-uc-response-feedback.js")).href
    );

  const extracted = extractCodexUcResponseFeedback(responseText);
  assert.deepEqual(
    extracted.map((entry) => entry.event),
    ["response.created", "response.completed"]
  );
  assert.deepEqual(extracted.at(-1).reasoning, {
    effort: "xhigh",
    summary: "concise",
  });

  const harnessHome = await mkdtemp(path.join(tmpdir(), "codex-uc-home-"));
  const previousHarnessHome = process.env.HARNESS_AI_HOME;
  process.env.HARNESS_AI_HOME = harnessHome;
  try {
    mkdirSync(harnessHome, { recursive: true });
    recordCodexUcResponseFeedback({
      profileId: "codex-synthetic-native",
      request: {
        include: ["reasoning.encrypted_content"],
        input: [{ content: "secret user text", role: "user" }],
        instructions: "secret prompt",
        model: "gpt-5.5",
        reasoning: { effort: "xhigh", summary: "concise" },
        store: false,
        stream: true,
        tools: [{ name: "secret_tool", type: "function" }],
      },
      responseStatus: 200,
      responseText,
      sessionId: "session-1",
    });
    const logPath = path.join(
      harnessHome,
      "logs",
      "providers",
      "codex-uc-response-feedback.jsonl"
    );
    assert.equal(existsSync(logPath), true);
    const logText = readFileSync(logPath, "utf8").trim();
    assert.equal(logText.includes("secret prompt"), false);
    assert.equal(logText.includes("secret user text"), false);
    assert.equal(logText.includes("secret_tool"), false);
    const record = JSON.parse(logText);
    assert.deepEqual(record.requested.reasoning, {
      effort: "xhigh",
      summary: "concise",
    });
    assert.deepEqual(record.feedbackEvents.at(-1).reasoning, {
      effort: "xhigh",
      summary: "concise",
    });
  } finally {
    if (previousHarnessHome === undefined) {
      process.env.HARNESS_AI_HOME = undefined;
    } else {
      process.env.HARNESS_AI_HOME = previousHarnessHome;
    }
    await rm(harnessHome, { recursive: true, force: true });
  }

  console.log("codex-uc-response-feedback tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
