import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const AUTOPILOT_IMPORT =
  /import \{[^}]*\} from "[^"]*session-workflow-autopilot\.js";\n/u;
const transpile = (file, replace = (text) => text) =>
  ts.transpileModule(
    replace(readFileSync(new URL(file, import.meta.url), "utf8")),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
const buildDir = await mkdtemp(path.join(tmpdir(), "workflow-pause-"));

const PAUSE_NOTE = "Paused from the Harness plan panel";
const CONTINUE_NOTE = "Continued from the Harness plan panel";

/** A host whose `run` records the Kit calls; `fail` makes them fail. */
function fakeHost() {
  const runs = [];
  const host = {
    fail: null,
    run: (args, options) => {
      runs.push([args, options]);
      return Promise.resolve(
        host.fail ?? {
          command: args[0],
          ok: true,
          result: { at: "now", note: args[3], paused: args[1] === "--on" },
        }
      );
    },
    runs,
  };
  return host;
}

/** An autopilot whose `refreshPause` returns the next pause state. */
function fakeAutopilot() {
  const refreshed = [];
  return {
    get: (sessionId) => ({ pauseState: "running", sessionId }),
    next: "paused",
    refreshPause(sessionId) {
      refreshed.push(sessionId);
      return Promise.resolve({ pauseState: this.next, sessionId });
    },
    refreshed,
    setEnabled: (sessionId, enabled) => Promise.resolve({ enabled, sessionId }),
    subscribe: () => () => undefined,
  };
}

const sessions = {
  get: (sessionId) => {
    if (sessionId === "s1") {
      return { id: "s1", workspaceId: "w1", workspacePath: "/work/one" };
    }
    return sessionId === "bare" ? { id: "bare", workspaceId: "" } : undefined;
  },
  list: () => [],
  send: () => ({ ok: true }),
  subscribe: () => () => undefined,
};

try {
  writeFileSync(
    path.join(buildDir, "core-workflow-pause.js"),
    transpile("./core-workflow-pause.ts"),
    "utf8"
  );
  const { setWorkflowPause } = await import(
    pathToFileURL(path.join(buildDir, "core-workflow-pause.js")).href
  );

  // Request validation: no Kit call, no autopilot refresh.
  const host = fakeHost();
  const autopilot = fakeAutopilot();
  const dependencies = { autopilot, host, sessions };
  for (const [sessionId, paused, code] of [
    ["", true, "INVALID_REQUEST"],
    ["s1", "yes", "INVALID_REQUEST"],
    ["s1", undefined, "INVALID_REQUEST"],
    ["ghost", true, "UNKNOWN_SESSION"],
    ["bare", true, "NO_WORKSPACE"],
  ]) {
    const result = await setWorkflowPause(dependencies, sessionId, paused);
    assert.equal(result.ok, false);
    assert.equal(result.code, code);
  }
  assert.equal(host.runs.length, 0);
  assert.equal(autopilot.refreshed.length, 0);

  // Pause on: Kit `pause:set --on` in the session workspace, then refresh.
  assert.deepEqual(await setWorkflowPause(dependencies, "s1", true), {
    autopilot: { pauseState: "paused", sessionId: "s1" },
    ok: true,
  });
  assert.deepEqual(host.runs.at(-1), [
    ["pause:set", "--on", "--note", PAUSE_NOTE],
    { root: "/work/one" },
  ]);
  assert.deepEqual(autopilot.refreshed, ["s1"]);

  // Pause off: `pause:set --off`, then refresh (the autopilot continues).
  autopilot.next = "running";
  assert.deepEqual(await setWorkflowPause(dependencies, "s1", false), {
    autopilot: { pauseState: "running", sessionId: "s1" },
    ok: true,
  });
  assert.deepEqual(host.runs.at(-1), [
    ["pause:set", "--off", "--note", CONTINUE_NOTE],
    { root: "/work/one" },
  ]);
  assert.deepEqual(autopilot.refreshed, ["s1", "s1"]);

  // A Kit failure is returned as its envelope; the autopilot is not refreshed.
  const kitFailure = {
    code: "ASSIGNMENT_READ_ONLY",
    message: "pause:set runs in the main checkout only.",
    nextAction: null,
    ok: false,
  };
  host.fail = kitFailure;
  assert.deepEqual(
    await setWorkflowPause(dependencies, "s1", true),
    kitFailure
  );
  assert.deepEqual(autopilot.refreshed, ["s1", "s1"]);

  // CoreProjectWorkflowRpc routes `workflow-pause-set` to the route.
  for (const file of [
    "core-workflow-mode-choice",
    "core-workflow-plan-view",
    "core-workflow-watch",
  ]) {
    writeFileSync(
      path.join(buildDir, `${file}.js`),
      transpile(`./${file}.ts`),
      "utf8"
    );
  }
  writeFileSync(
    path.join(buildDir, "rpc.js"),
    transpile("./core-project-workflow-rpc.ts", (text) =>
      text.replace(AUTOPILOT_IMPORT, "const sessionWorkflowAutopilot = null;\n")
    ),
    "utf8"
  );
  const { CoreProjectWorkflowRpc } = await import(
    pathToFileURL(path.join(buildDir, "rpc.js")).href
  );
  assert.equal(CoreProjectWorkflowRpc.handles("workflow-pause-set"), true);
  assert.equal(CoreProjectWorkflowRpc.handles("workflow-autopilot-get"), true);
  assert.equal(CoreProjectWorkflowRpc.handles("workflow-autopilot-set"), true);
  const rpcHost = fakeHost();
  const rpcAutopilot = fakeAutopilot();
  const rpc = new CoreProjectWorkflowRpc({
    addWorkspace: () => {
      throw new Error("not used");
    },
    autopilot: rpcAutopilot,
    host: rpcHost,
    sessions,
    workspaces: () => ({ active: null, known: [] }),
  });
  assert.deepEqual(
    await rpc.invoke("workflow-pause-set", { paused: true, sessionId: "s1" }),
    { autopilot: { pauseState: "paused", sessionId: "s1" }, ok: true }
  );
  assert.deepEqual(rpcHost.runs.at(-1)[0], [
    "pause:set",
    "--on",
    "--note",
    PAUSE_NOTE,
  ]);
  assert.equal(
    (await rpc.invoke("workflow-pause-set", { sessionId: "s1" })).code,
    "INVALID_REQUEST"
  );
  // `workflow-autopilot-get` returns the snapshot with its pauseState.
  assert.deepEqual(
    await rpc.invoke("workflow-autopilot-get", { sessionId: "s1" }),
    { autopilot: { pauseState: "running", sessionId: "s1" }, ok: true }
  );
  rpc.close();
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
