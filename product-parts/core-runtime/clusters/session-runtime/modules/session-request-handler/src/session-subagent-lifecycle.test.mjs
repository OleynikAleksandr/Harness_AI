import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-subagent-lifecycle.ts", import.meta.url),
  "utf8"
);
const routerSource = readFileSync(
  new URL("./session-provider-event-router.ts", import.meta.url),
  "utf8"
);
const bindingLifecycleSource = readFileSync(
  new URL("./session-provider-binding-lifecycle.ts", import.meta.url),
  "utf8"
);

assert.match(source, /event\.type === "subagent_control"/u);
assert.match(source, /event\.type === "subagent_session"/u);
assert.match(source, /handleStatusEvent/u);
assert.match(
  source,
  /const child = this\.ensureChildSession\(parent,[\s\S]+?this\.updateParentCall\(child, event\.timestamp\)/u
);
assert.match(source, /sessionKind: "subagent"/u);
assert.match(source, /parentSessionId: parent\.id/u);
assert.match(source, /providerSessionId: inheritedSeed\.providerSessionId/u);
assert.match(
  source,
  /seed\.reasoningEffort \?\?\s+parent\.reasoningEffort \?\?\s+resolveConfiguredReasoningEffort\(parent\)/u
);
assert.match(source, /buildProviderTurnOptions\(session\)\.reasoningEffort/u);
assert.match(source, /subagentCallId/u);
assert.match(source, /titleOrigin: "auto"/u);
assert.match(source, /adoptProviderSession/u);
assert.match(source, /publishSubagentCall/u);
assert.match(source, /resolveCallStatus/u);
assert.match(source, /status === "interrupted"/u);
assert.match(source, /status === "not_found"/u);
assert.match(source, /status === "pending" \|\| status === "running"/u);
assert.doesNotMatch(source, /message\.text/u);
assert.doesNotMatch(source, /rollout/u);
assert.match(routerSource, /isProviderSubagentEvent\(event\)/u);
assert.match(
  routerSource,
  /context\.handleSubagentEvent\?\.\(sessionId, event\)/u
);
assert.match(bindingLifecycleSource, /adoptProviderSession\(/u);
assert.match(bindingLifecycleSource, /parentBinding\.adapter\.subscribe/u);
assert.match(
  bindingLifecycleSource,
  /handleSubagentEvent: this\.deps\.handleSubagentEvent/u
);

// A provider-handed terminal result waits until the current event batch has
// drained, then publishes only when no assistant content arrived on the
// child's live channel.
assert.match(source, /publishChildResultMessage/u);
assert.match(
  source,
  /queueMicrotask\([\s\S]+?hasAssistantMessage\(child\.id\)[\s\S]+?publishChildResultMessage/u
);

// Terminal child statuses are monotonic: historical running/pending replay
// never downgrades them without strictly newer provider evidence.
assert.match(source, /TERMINAL_SUBAGENT_STATUSES/u);
assert.match(
  source,
  /guardSubagentStatus\(session, event\.status, event\.timestamp\)/u
);
assert.match(source, /guardSubagentStatus\(child, state\.status, timestamp\)/u);
assert.match(
  source,
  /guardSubagentStatus\(session, seed\.status, seed\.timestamp\)/u
);
assert.match(source, /timestamp > session\.updatedAt \? status : current/u);

const buildOptionsUrl = `data:text/javascript;base64,${Buffer.from(
  "export const buildProviderTurnOptions = () => ({});"
).toString("base64")}`;
const runtimeUtilsUrl = `data:text/javascript;base64,${Buffer.from(
  "let id = 0; export const createId = (prefix) => prefix + '-' + ++id;"
).toString("base64")}`;
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replace("./provider-turn-options.js", buildOptionsUrl)
  .replace("./session-request-handler-runtime-utils.js", runtimeUtilsUrl);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { SessionSubagentLifecycle } = await import(moduleUrl);

const exerciseTerminalResult = async (hasAssistantMessage) => {
  const parent = {
    createdAt: "2026-07-19T10:00:00.000Z",
    id: "parent-core",
    model: "k3",
    nextSessionMode: "native",
    providerId: "kimi-client",
    providerName: "Kimi",
    providerSessionId: "parent-provider",
    reasoningEffort: "max",
    title: "Parent",
    updatedAt: "2026-07-19T10:00:00.000Z",
    workspaceId: "workspace",
  };
  const sessions = new Map([[parent.id, parent]]);
  const publishedResults = [];
  const lifecycle = new SessionSubagentLifecycle({
    addSession: (session) => sessions.set(session.id, session),
    adoptProviderSession: () => undefined,
    getSession: (sessionId) => sessions.get(sessionId),
    getSubagentCall: () => undefined,
    hasAssistantMessage: () => hasAssistantMessage,
    listSessions: () => [...sessions.values()],
    publishChildResultMessage: (message) => publishedResults.push(message),
    publishSubagentCall: () => undefined,
    updateSession: (session) => sessions.set(session.id, session),
  });
  lifecycle.handleProviderEvent(parent.id, {
    parentProviderSessionId: parent.providerSessionId,
    providerSessionId: "kimi-agent-1:tool_result",
    result: "Terminal fallback result.",
    status: "completed",
    timestamp: "2026-07-19T10:00:01.000Z",
    type: "subagent_session",
  });
  assert.deepEqual(publishedResults, []);
  await Promise.resolve();
  return publishedResults;
};

assert.equal((await exerciseTerminalResult(false)).length, 1);
assert.equal((await exerciseTerminalResult(true)).length, 0);
