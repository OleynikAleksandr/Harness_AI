import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const PROMPT_CACHE_KEY_REGEX = /^pck_[a-f0-9]{24}$/u;
const source = readFileSync(
  new URL("./codex-uc-responses.ts", import.meta.url),
  "utf8"
);
const promptCacheKeySource = readFileSync(
  new URL("./codex-uc-prompt-cache-key.ts", import.meta.url),
  "utf8"
);
const phaseProtocolSource = readFileSync(
  new URL("./codex-uc-phase-protocol.ts", import.meta.url),
  "utf8"
);
const customToolCallsSource = readFileSync(
  new URL("./codex-uc-custom-tool-calls.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const compiledCustomToolCalls = ts.transpileModule(customToolCallsSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const compiledPromptCacheKey = ts.transpileModule(promptCacheKeySource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const compiledPhaseProtocol = ts.transpileModule(phaseProtocolSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const buildDir = await mkdtemp(path.join(tmpdir(), "codex-uc-responses-"));

try {
  writeFileSync(path.join(buildDir, "codex-uc-responses.js"), compiled);
  writeFileSync(
    path.join(buildDir, "codex-uc-custom-tool-calls.js"),
    compiledCustomToolCalls
  );
  writeFileSync(
    path.join(buildDir, "codex-uc-prompt-cache-key.js"),
    compiledPromptCacheKey
  );
  writeFileSync(
    path.join(buildDir, "codex-uc-phase-protocol.js"),
    compiledPhaseProtocol
  );
  const { buildCodexUcResponsesRequest } = await import(
    pathToFileURL(path.join(buildDir, "codex-uc-responses.js")).href
  );
  const request = buildCodexUcResponsesRequest({
    instructions: "i",
    items: [{ content: "u", role: "user" }],
    model: "gpt-5.5",
    nativeInputPrefix: [developerPrefix("developer prefix")],
    nativeTools: [
      {
        description: "Native read",
        name: "native_read_file",
        parameters: { type: "object" },
        type: "function",
      },
    ],
    reasoningEffort: "low",
    requestTemplate: {
      model: "gpt-5.5",
      prompt_cache_key: "captured-key-should-not-leak",
      text: { verbosity: "low" },
      type: "response.create",
    },
    tools: [
      {
        description: "Read",
        name: "read_file",
        parametersSchema: { type: "object" },
        qualifiedName: "read_file",
        source: "builtin",
      },
    ],
  });
  assert.equal(request.store, false);
  assert.equal(request.stream, true);
  assert.deepEqual(request.include, ["reasoning.encrypted_content"]);
  assert.deepEqual(request.reasoning, { effort: "low", summary: "detailed" });
  assert.equal(Object.hasOwn(request, "type"), false);
  assert.equal(request.text.verbosity, "low");
  assert.deepEqual(
    request.input.map((item) => item.role),
    ["developer", "developer", "user"]
  );
  assert.equal(request.tools[0].name, "native_read_file");
  assert.equal(request.tools.at(-1).name, "final_answer");
  assert.equal(
    request.tools.filter((tool) => tool.name === "final_answer").length,
    1
  );
  assert.match(request.prompt_cache_key, PROMPT_CACHE_KEY_REGEX);
  assert.notEqual(request.prompt_cache_key, "captured-key-should-not-leak");
  assert.deepEqual(Object.keys(request).slice(0, 5), [
    "model",
    "instructions",
    "tools",
    "prompt_cache_key",
    "input",
  ]);

  const requestWithDifferentInput = buildCodexUcResponsesRequest({
    instructions: "i",
    items: [{ content: "different dynamic user input", role: "user" }],
    model: "gpt-5.5",
    nativeInputPrefix: [developerPrefix("developer prefix")],
    nativeTools: request.tools,
    reasoningEffort: "low",
    requestTemplate: { model: "gpt-5.5", text: { verbosity: "low" } },
    tools: [],
  });
  assert.equal(
    requestWithDifferentInput.prompt_cache_key,
    request.prompt_cache_key
  );
  assert.equal(
    requestWithDifferentInput.tools.filter(
      (tool) => tool.name === "final_answer"
    ).length,
    1
  );

  const requestWithDifferentInputPrefix = buildCodexUcResponsesRequest({
    instructions: "i",
    items: [{ content: "u", role: "user" }],
    model: "gpt-5.5",
    nativeInputPrefix: [developerPrefix("different developer prefix")],
    nativeTools: request.tools,
    reasoningEffort: "low",
    requestTemplate: { model: "gpt-5.5", text: { verbosity: "low" } },
    tools: [],
  });
  assert.notEqual(
    requestWithDifferentInputPrefix.prompt_cache_key,
    request.prompt_cache_key
  );

  const requestWithTemplateReasoning = buildCodexUcResponsesRequest({
    instructions: "i",
    items: [{ content: "u", role: "user" }],
    model: "gpt-5.5",
    nativeTools: request.tools,
    reasoningEffort: "low",
    requestTemplate: {
      model: "gpt-5.5",
      reasoning: { effort: "high", summary: "detailed" },
      text: { verbosity: "low" },
    },
    tools: [],
  });
  assert.deepEqual(requestWithTemplateReasoning.reasoning, {
    effort: "low",
    summary: "detailed",
  });

  const requestWithTemplateOnlyReasoning = buildCodexUcResponsesRequest({
    instructions: "i",
    items: [{ content: "u", role: "user" }],
    model: "gpt-5.5",
    nativeTools: request.tools,
    requestTemplate: {
      model: "gpt-5.5",
      reasoning: { effort: "high", summary: "detailed" },
      text: { verbosity: "low" },
    },
    tools: [],
  });
  assert.deepEqual(requestWithTemplateOnlyReasoning.reasoning, {
    effort: "high",
    summary: "detailed",
  });
  console.log("codex-uc-responses tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}

function developerPrefix(text) {
  return {
    content: [{ text, type: "input_text" }],
    role: "developer",
    type: "message",
  };
}
