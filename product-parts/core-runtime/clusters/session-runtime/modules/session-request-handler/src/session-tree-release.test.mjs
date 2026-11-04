import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Behaviour test of the session tree release: transpile the module and stub
// its runtime-utils import with the real helpers' contract.
const compile = (specifier) =>
  ts.transpileModule(
    readFileSync(new URL(specifier, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
const utilsStub = `
export const calls = [];
export function closeAndCleanupProviderSession(options) {
  options.binding?.unsubscribe();
  calls.push({ binding: options.binding?.providerSessionId ?? null, workspacePath: options.workspacePath ?? null, providerSessionId: options.providerSessionId ?? null });
}
export function collectSessionTreeIds(sessions, sessionId) {
  const ids = [sessionId];
  for (const session of sessions.values()) {
    if (session.parentSessionId === sessionId) ids.push(session.id);
  }
  return ids;
}`;
const utilsUrl = `data:text/javascript;base64,${Buffer.from(utilsStub).toString("base64")}`;
const source = compile("./session-tree-release.ts").replace(
  "./session-request-handler-runtime-utils.js",
  utilsUrl
);
const { deleteSessionTree, releaseWorkspaceSessions } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const { calls } = await import(utilsUrl);

const makeStore = () => {
  const unsubscribed = [];
  const binding = (id) => ({
    adapter: { closeSession: () => Promise.resolve() },
    providerSessionId: `p-${id}`,
    unsubscribe: () => unsubscribed.push(id),
  });
  const sessions = new Map(
    [
      {
        id: "a",
        workspaceId: "w1",
        workspacePath: "/w1",
        providerId: "claude",
      },
      {
        id: "a-child",
        parentSessionId: "a",
        workspaceId: "w1",
        workspacePath: "/w1",
        providerId: "claude",
      },
      { id: "b", workspaceId: "w2", workspacePath: "/w2", providerId: "codex" },
    ].map((session) => [session.id, session])
  );
  const keyed = () => new Map([...sessions.keys()].map((id) => [id, id]));
  return {
    store: {
      messagesBySession: keyed(),
      runtimeBindings: new Map([
        ["a", binding("a")],
        ["b", binding("b")],
      ]),
      sessions,
      telemetryBySession: keyed(),
    },
    unsubscribed,
  };
};

// Releasing a workspace closes its bindings and drops only its records,
// without deleting provider artifacts (no workspace path to the cleanup).
const released = makeStore();
assert.deepEqual(releaseWorkspaceSessions(released.store, "w1"), [
  "a",
  "a-child",
]);
assert.deepEqual([...released.store.sessions.keys()], ["b"]);
assert.deepEqual([...released.store.messagesBySession.keys()], ["b"]);
assert.deepEqual([...released.store.telemetryBySession.keys()], ["b"]);
assert.deepEqual([...released.store.runtimeBindings.keys()], ["b"]);
assert.deepEqual(released.unsubscribed, ["a"]);
assert.ok(calls.every((call) => call.workspacePath === null));

// Deleting a tree removes children first and cleans artifacts of each.
calls.length = 0;
const deleted = makeStore();
const eventDeletes = [];
const overlayDeletes = [];
deleteSessionTree(deleted.store, "a", {
  eventStream: { deleteSessionEvents: (id) => eventDeletes.push(id) },
  providerRegistry: { getAdapter: () => null },
  reasoningTranslation: {
    deleteSessionOverlays: (path, id) => overlayDeletes.push(`${path}:${id}`),
  },
});
assert.deepEqual(eventDeletes, ["a-child", "a"]);
assert.deepEqual(overlayDeletes, ["/w1:a-child", "/w1:a"]);
assert.deepEqual(
  calls.map((call) => [call.providerSessionId, call.workspacePath]),
  [
    [null, "/w1"],
    ["p-a", "/w1"],
  ]
);
assert.deepEqual([...deleted.store.sessions.keys()], ["b"]);
console.log("session-tree-release tests passed");
