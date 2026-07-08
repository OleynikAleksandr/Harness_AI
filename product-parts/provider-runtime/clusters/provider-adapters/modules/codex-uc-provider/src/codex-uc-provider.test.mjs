import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./codex-uc-provider-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import \{ createBuiltinToolSource \}[^\n]*\n/u,
    [
      "const createBuiltinToolSource = () => ({",
      "  source: 'builtin',",
      "  list: () => [",
      "    { description: 'Read file', name: 'read_file', parametersSchema: { type: 'object' }, qualifiedName: 'read_file', source: 'builtin' },",
      "    { description: 'Write file', name: 'write_file', parametersSchema: { type: 'object' }, qualifiedName: 'write_file', source: 'builtin' },",
      "  ],",
      "  execute: async (name, argsJson) => {",
      "    globalThis.__codexUcExecuted.push([name, JSON.parse(argsJson)]);",
      "    return { output: name === 'read_file' ? 'file contents' : 'wrote file' };",
      "  },",
      "});\n",
    ].join("\n")
  )
  .replace(
    /import \{\n\s*createToolRegistry,\n\s*type ToolRegistry,\n\} from[^\n]*\n/u,
    [
      "const createToolRegistry = () => {",
      "  const sources = [];",
      "  return {",
      "    registerSource: (source) => sources.push(source),",
      "    listDescriptors: () => sources.flatMap((source) => source.list()),",
      "    execute: (name, args, ctx) => sources[0].execute(name, args, ctx),",
      "  };",
      "};\n",
    ].join("\n")
  )
  .replace(
    /import \{ resolveCodexReasoningEffort \}[^\n]*\n/u,
    "const resolveCodexReasoningEffort = () => 'medium';\n"
  )
  .replace(/import \{ settingsStoreFacade \}[^\n]*\n/u, "");
const responsesSource = readFileSync(
  new URL("./codex-uc-responses.ts", import.meta.url),
  "utf8"
);
const promptCacheKeySource = readFileSync(
  new URL("./codex-uc-prompt-cache-key.ts", import.meta.url),
  "utf8"
);
const nativeCaptureSource = readFileSync(
  new URL("./codex-uc-native-capture.ts", import.meta.url),
  "utf8"
);
const usageLimitsSource = readFileSync(
  new URL("./codex-uc-usage-limits.ts", import.meta.url),
  "utf8"
);
const feedbackSource = readFileSync(
  new URL("./codex-uc-response-feedback.ts", import.meta.url),
  "utf8"
);
const PROMPT_CACHE_KEY_REGEX = /^pck_[0-9a-f]{24}$/u;

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const compiledResponses = ts.transpileModule(responsesSource, {
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
const compiledNativeCapture = ts.transpileModule(nativeCaptureSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const compiledUsageLimits = ts.transpileModule(usageLimitsSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const compiledFeedback = ts.transpileModule(feedbackSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const buildDir = await mkdtemp(path.join(tmpdir(), "codex-uc-provider-"));

function sse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function responseText(step) {
  const usage = {
    input_tokens: 1000 + step,
    input_tokens_details: {
      cached_tokens: step === 2 ? 7400 : 0,
    },
  };
  if (step === 1) {
    return (
      sse("response.output_item.done", {
        item: {
          arguments: '{"path":"source.txt"}',
          call_id: "call-read",
          name: "read_file",
          type: "function_call",
        },
      }) + sse("response.completed", { response: { id: "r1", usage } })
    );
  }
  if (step === 2) {
    return (
      sse("response.output_item.done", {
        item: {
          arguments: '{"path":"summary.txt","content":"summary"}',
          call_id: "call-write",
          name: "write_file",
          type: "function_call",
        },
      }) + sse("response.completed", { response: { id: "r2", usage } })
    );
  }
  return (
    sse("response.created", {
      response: {
        id: "r3",
        model: "gpt-5.5",
        reasoning: { effort: "low", summary: "concise" },
        status: "in_progress",
      },
    }) +
    sse("response.reasoning_summary.delta", {
      delta: { text: "thinking " },
    }) +
    sse("response.reasoning_summary.delta", {
      delta: { text: "through" },
    }) +
    sse("response.output_text.delta", { delta: "summary" }) +
    sse("response.output_item.done", {
      item: {
        content: [{ text: "summary", type: "output_text" }],
        role: "assistant",
        type: "message",
      },
    }) +
    sse("response.completed", {
      response: {
        id: "r3",
        model: "gpt-5.5",
        reasoning: { effort: "low", summary: "concise" },
        status: "completed",
        usage,
      },
    })
  );
}

try {
  writeFileSync(path.join(buildDir, "codex-uc-provider-facade.js"), compiled);
  writeFileSync(
    path.join(buildDir, "codex-uc-responses.js"),
    compiledResponses
  );
  writeFileSync(
    path.join(buildDir, "codex-uc-prompt-cache-key.js"),
    compiledPromptCacheKey
  );
  writeFileSync(
    path.join(buildDir, "codex-uc-native-capture.js"),
    compiledNativeCapture
  );
  writeFileSync(
    path.join(buildDir, "codex-uc-usage-limits.js"),
    compiledUsageLimits
  );
  writeFileSync(
    path.join(buildDir, "codex-uc-response-feedback.js"),
    compiledFeedback
  );
  const { CodexUcProviderFacade } = await import(
    pathToFileURL(path.join(buildDir, "codex-uc-provider-facade.js")).href
  );

  assert.match(
    nativeCaptureSource,
    /input\.options\.profileId \|\| DEFAULT_CAPTURE_PROFILE_ID/u
  );
  assert.match(nativeCaptureSource, /Profiles",\s*"CodexUC",\s*profileId/su);
  assert.match(nativeCaptureSource, /custom-instructions\.md/u);
  assert.match(nativeCaptureSource, /mergeCustomInstructions/u);
  assert.match(nativeCaptureSource, /kind: "codex-uc"/u);

  const workspace = await mkdtemp(path.join(tmpdir(), "codex-uc-ws-"));
  const authPath = path.join(workspace, "auth.json");
  mkdirSync(path.dirname(authPath), { recursive: true });
  writeFileSync(
    authPath,
    JSON.stringify({ tokens: { access_token: "token", account_id: "acct" } })
  );

  globalThis.__codexUcExecuted = [];
  let fetchCount = 0;
  const previousHarnessHome = process.env.HARNESS_AI_HOME;
  process.env.HARNESS_AI_HOME = workspace;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, init) => {
    fetchCount += 1;
    globalThis.__codexUcLastHeaders = init.headers;
    const body = JSON.parse(init.body);
    globalThis.__codexUcLastBody = body;
    assert.deepEqual(
      body.tools.map((tool) => tool.name),
      ["read_file", "write_file"]
    );
    assert.equal(Object.hasOwn(body, "type"), false);
    assert.equal(body.text.verbosity, "low");
    assert.match(body.prompt_cache_key, PROMPT_CACHE_KEY_REGEX);
    assert.deepEqual(Object.keys(body).slice(0, 5), [
      "model",
      "instructions",
      "tools",
      "prompt_cache_key",
      "input",
    ]);
    return new Response(responseText(fetchCount), {
      headers:
        fetchCount === 3
          ? {
              "x-codex-session-used-percent": "9",
              "x-codex-weekly-limit": "100",
              "x-codex-weekly-remaining": "39",
            }
          : undefined,
      status: 200,
    });
  };

  try {
    const usageLimitRefreshes = [];
    const adapter = new CodexUcProviderFacade(workspace, {
      authPath,
      usageLimitsAdapter: {
        refreshUsageLimits: (request) => usageLimitRefreshes.push(request),
      },
    });
    const outcome = await adapter.createSession(workspace, {
      profile: {
        contentHash: "hash",
        profileId: "p",
        profileName: "Profile",
        prompt: "profile prompt",
        inputPrefix: [
          {
            content: [{ text: "profile developer prefix", type: "input_text" }],
            role: "developer",
            type: "message",
          },
        ],
        requestTemplate: {
          text: { verbosity: "low" },
          type: "response.create",
        },
        tools: [
          {
            description: "Read",
            name: "read_file",
            parameters: { type: "object" },
            type: "function",
          },
          {
            description: "Write",
            name: "write_file",
            parameters: { type: "object" },
            type: "function",
          },
        ],
        toolingCategories: {},
      },
      profileKind: "managed",
    });
    assert.equal(outcome.providerSessionId.startsWith("codex-uc-"), true);
    assert.equal(
      outcome.appliedProfileApplication.route,
      "codex-oauth-responses"
    );
    assert.equal(
      outcome.appliedProfileApplication.toolSurface,
      "profile-native-tools"
    );

    const events = [];
    adapter.subscribe(outcome.providerSessionId, (event) => events.push(event));
    await adapter.sendMessage(outcome.providerSessionId, "go", {
      model: "gpt-5.5",
      reasoningEffort: "low",
    });

    assert.equal(fetchCount, 3);
    assert.equal(
      globalThis.__codexUcLastHeaders["session-id"],
      outcome.providerSessionId
    );
    assert.equal(
      globalThis.__codexUcLastHeaders.session_id,
      outcome.providerSessionId
    );
    assert.equal(
      globalThis.__codexUcLastHeaders["x-client-request-id"],
      outcome.providerSessionId
    );
    assert.equal(
      globalThis.__codexUcLastHeaders["x-session-affinity"],
      outcome.providerSessionId
    );
    assert.deepEqual(
      globalThis.__codexUcExecuted.map(([name]) => name),
      ["read_file", "write_file"]
    );
    assert.equal(globalThis.__codexUcLastBody.instructions, "profile prompt");
    assert.equal(globalThis.__codexUcLastBody.input[0].role, "developer");
    assert.equal(
      globalThis.__codexUcLastBody.input.some((item) => item.role === "user"),
      true
    );
    assert.deepEqual(
      events.map((event) => event.type),
      [
        "turn_started",
        "stream_event",
        "stream_event",
        "stream_event",
        "dialog_message",
        "dialog_message",
        "stream_event",
        "turn_completed",
      ]
    );
    assert.equal(events[4].role, "thinking");
    assert.equal(events[4].content, "thinking through");
    assert.equal(events[5].role, "assistant");
    assert.equal(events[1].data.tokenUsage.cached, 0);
    assert.equal(events[2].data.tokenUsage.cached, 7400);
    assert.equal(events[3].data.usageLimits.currentSession.percentUsed, 9);
    assert.equal(
      events[3].data.usageLimits.currentWeekAllModels.percentUsed,
      61
    );
    assert.equal(events[6].data.tokenUsage.cached, 0);
    adapter.refreshUsageLimits({
      broadcast: () => undefined,
      providerSessionId: outcome.providerSessionId,
      runtimeSessionId: "runtime-session",
      workspacePath: workspace,
    });
    assert.equal(usageLimitRefreshes.length, 1);

    const rollback = await adapter.rollbackSessionTurns(
      outcome.providerSessionId,
      1
    );
    assert.equal(rollback.turns, 1);
    await adapter.sendMessage(outcome.providerSessionId, "after rollback", {
      model: "gpt-5.5",
      reasoningEffort: "low",
    });
    assert.deepEqual(
      globalThis.__codexUcLastBody.input.map((item) => item.role),
      ["developer", "user"]
    );
    assert.equal(
      globalThis.__codexUcLastBody.input.at(-1).content,
      "after rollback"
    );
  } finally {
    if (previousHarnessHome === undefined) {
      process.env.HARNESS_AI_HOME = undefined;
    } else {
      process.env.HARNESS_AI_HOME = previousHarnessHome;
    }
    globalThis.fetch = originalFetch;
    await rm(workspace, { recursive: true, force: true });
  }

  console.log("codex-uc-provider tests passed");
} finally {
  globalThis.__codexUcExecuted = undefined;
  globalThis.__codexUcLastHeaders = undefined;
  globalThis.__codexUcLastBody = undefined;
  await rm(buildDir, { recursive: true, force: true });
}
