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
const usageLimitsSource = readFileSync(
  new URL("./codex-uc-usage-limits.ts", import.meta.url),
  "utf8"
);

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
const compiledUsageLimits = ts.transpileModule(usageLimitsSource, {
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
    sse("response.completed", { response: { id: "r3", usage } })
  );
}

try {
  writeFileSync(path.join(buildDir, "codex-uc-provider-facade.js"), compiled);
  writeFileSync(
    path.join(buildDir, "codex-uc-responses.js"),
    compiledResponses
  );
  writeFileSync(
    path.join(buildDir, "codex-uc-usage-limits.js"),
    compiledUsageLimits
  );
  const { buildCodexUcResponsesRequest, CodexUcProviderFacade } = await import(
    pathToFileURL(path.join(buildDir, "codex-uc-provider-facade.js")).href
  );

  const request = buildCodexUcResponsesRequest({
    instructions: "i",
    items: [{ content: "u", role: "user" }],
    model: "gpt-5.5",
    reasoningEffort: "low",
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
  assert.equal(request.tools[0].name, "read_file");

  const workspace = await mkdtemp(path.join(tmpdir(), "codex-uc-ws-"));
  const authPath = path.join(workspace, "auth.json");
  mkdirSync(path.dirname(authPath), { recursive: true });
  writeFileSync(
    authPath,
    JSON.stringify({ tokens: { access_token: "token", account_id: "acct" } })
  );

  globalThis.__codexUcExecuted = [];
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, init) => {
    fetchCount += 1;
    const body = JSON.parse(init.body);
    globalThis.__codexUcLastBody = body;
    assert.deepEqual(
      body.tools.map((tool) => tool.name),
      ["read_file", "write_file"]
    );
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
        toolingCategories: {},
      },
      profileKind: "managed",
    });
    assert.equal(outcome.providerSessionId.startsWith("codex-uc-"), true);
    assert.equal(
      outcome.appliedProfileApplication.route,
      "codex-oauth-responses"
    );

    const events = [];
    adapter.subscribe(outcome.providerSessionId, (event) => events.push(event));
    await adapter.sendMessage(outcome.providerSessionId, "go", {
      model: "gpt-5.5",
      reasoningEffort: "low",
    });

    assert.equal(fetchCount, 3);
    assert.deepEqual(
      globalThis.__codexUcExecuted.map(([name]) => name),
      ["read_file", "write_file"]
    );
    assert.equal(globalThis.__codexUcLastBody.instructions, "profile prompt");
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
    assert.deepEqual(globalThis.__codexUcLastBody.input, [
      { content: "after rollback", role: "user" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(workspace, { recursive: true, force: true });
  }

  console.log("codex-uc-provider tests passed");
} finally {
  globalThis.__codexUcExecuted = undefined;
  globalThis.__codexUcLastBody = undefined;
  await rm(buildDir, { recursive: true, force: true });
}
