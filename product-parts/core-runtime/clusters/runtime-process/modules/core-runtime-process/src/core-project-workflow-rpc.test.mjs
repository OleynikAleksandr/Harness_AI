import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./core-project-workflow-rpc.ts", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("./core-runtime-api.ts", import.meta.url),
  "utf8"
);
const AUTOPILOT_IMPORT =
  /import \{[^}]*\} from "[^"]*session-workflow-autopilot\.js";\n/u;
assert.match(source, AUTOPILOT_IMPORT);
const compiled = ts.transpileModule(
  source.replace(AUTOPILOT_IMPORT, "const sessionWorkflowAutopilot = null;\n"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const buildDir = await mkdtemp(path.join(tmpdir(), "project-workflow-rpc-"));

function fakeHost(states) {
  const calls = [];
  const ok = (result) => Promise.resolve({ command: "x", ok: true, result });
  return {
    calls,
    doctor: (root, fix) => {
      calls.push(["doctor", root, fix]);
      return ok({ checks: [], ok: true });
    },
    inspect: (folder) => {
      calls.push(["inspect", folder]);
      const state = states[folder] ?? "MISSING";
      if (state === "FAIL") {
        return Promise.resolve({
          code: "HOST_SPAWN",
          message: "x",
          nextAction: null,
          ok: false,
        });
      }
      const actions = {
        EMPTY: "install",
        GIT_NO_KIT: "install",
        KIT_OK: "open",
        KIT_OUTDATED: "update",
        LEGACY_HARNESS_PLAN: "install-migrate",
        MISSING: "create",
        PILOT_KIT: "unsupported",
      };
      return ok({
        action: actions[state],
        nestedIn: null,
        path: folder,
        state,
      });
    },
    install: (folder, options) => {
      calls.push(["install", folder, options]);
      if (states[folder] === "GIT_NO_KIT" && options.name === "Broken") {
        return Promise.resolve({
          code: "GIT_IDENTITY",
          message: "x",
          nextAction: "y",
          ok: false,
        });
      }
      return ok({ commit: { sha: "abc" }, root: folder });
    },
    status: (root) => {
      calls.push(["status", root]);
      return ok({ installed: true, root });
    },
    writeRuntimeFile: (root) => {
      calls.push(["runtime", root]);
      return true;
    },
  };
}

try {
  writeFileSync(path.join(buildDir, "rpc.js"), compiled, "utf8");
  const { CoreProjectWorkflowRpc, WORKFLOW_STATUS_EVENT_TYPE } = await import(
    pathToFileURL(path.join(buildDir, "rpc.js")).href
  );
  assert.equal(WORKFLOW_STATUS_EVENT_TYPE, "workflow:status");
  for (const method of [
    "workflow-autopilot-get",
    "workflow-autopilot-set",
    "workflow-inspect",
    "workflow-prepare-project",
    "workflow-status",
    "workflow-doctor",
  ]) {
    assert.equal(CoreProjectWorkflowRpc.handles(method), true);
  }
  assert.equal(CoreProjectWorkflowRpc.handles("list-workspaces"), false);

  const active = { id: "w1", name: "One", path: "/work/one" };
  const known = [active, { id: "w2", name: "Two", path: "/work/two" }];
  const host = fakeHost({
    "/new/demo": "MISSING",
    "/open/broken": "GIT_NO_KIT",
    "/open/fail": "FAIL",
    "/open/git": "GIT_NO_KIT",
    "/open/legacy": "LEGACY_HARNESS_PLAN",
    "/open/ok": "KIT_OK",
    "/open/old": "KIT_OUTDATED",
    "/open/pilot": "PILOT_KIT",
    "/taken/demo": "GIT_NO_KIT",
  });
  const added = [];
  const autopilotListeners = [];
  const autopilotCalls = [];
  const autopilot = {
    get: (sessionId) => ({ enabled: false, sessionId }),
    setEnabled: (sessionId, enabled) => {
      autopilotCalls.push([sessionId, enabled]);
      return Promise.resolve({ enabled, sessionId });
    },
    subscribe: (listener) => {
      autopilotListeners.push(listener);
      return () => undefined;
    },
  };
  const rpc = new CoreProjectWorkflowRpc({
    autopilot,
    addWorkspace: (workspacePath) => {
      const workspace = {
        id: `id:${workspacePath}`,
        name: "x",
        path: workspacePath,
      };
      added.push(workspacePath);
      return workspace;
    },
    host,
    workspaces: () => ({ active, known }),
  });
  const events = [];
  const unsubscribe = rpc.subscribe((event) => events.push(event));

  // Inspection validates the path and delegates to the host.
  assert.equal(
    (await rpc.invoke("workflow-inspect", { path: "relative" })).code,
    "INVALID_REQUEST"
  );
  assert.equal(
    (await rpc.invoke("workflow-inspect", { path: "/open/ok" })).result.state,
    "KIT_OK"
  );

  // Request validation.
  assert.equal(
    (
      await rpc.invoke("workflow-prepare-project", {
        mode: "copy",
        path: "/new",
      })
    ).code,
    "INVALID_REQUEST"
  );
  assert.equal(
    (
      await rpc.invoke("workflow-prepare-project", {
        mode: "new",
        path: "/new",
        name: "a/b",
      })
    ).code,
    "INVALID_REQUEST"
  );
  assert.equal(
    (
      await rpc.invoke("workflow-prepare-project", {
        mode: "new",
        path: "/new",
        name: "..",
      })
    ).code,
    "INVALID_REQUEST"
  );
  assert.equal(
    (
      await rpc.invoke("workflow-prepare-project", {
        mode: "open",
        path: "rel",
      })
    ).code,
    "INVALID_REQUEST"
  );

  // New project: parent + name, install with the name, register, publish.
  const created = await rpc.invoke("workflow-prepare-project", {
    mode: "new",
    name: "demo",
    path: "/new",
  });
  assert.equal(created.ok, true);
  assert.deepEqual(
    host.calls.find((call) => call[0] === "install"),
    ["install", "/new/demo", { name: "demo", update: false }]
  );
  assert.deepEqual(created.install, {
    commit: { sha: "abc" },
    root: "/new/demo",
  });
  assert.equal(created.workspace.path, "/new/demo");
  assert.deepEqual(added, ["/new/demo"]);
  assert.ok(
    host.calls.some((call) => call[0] === "runtime" && call[1] === "/new/demo")
  );
  assert.deepEqual(events.at(-1), {
    path: "/new/demo",
    status: {
      command: "x",
      ok: true,
      result: { installed: true, root: "/new/demo" },
    },
    type: "workflow:status",
    workspaceId: "id:/new/demo",
  });
  const taken = await rpc.invoke("workflow-prepare-project", {
    mode: "new",
    name: "demo",
    path: "/taken",
  });
  assert.equal(taken.code, "PROJECT_EXISTS");

  // Open project: by inspect action.
  host.calls.length = 0;
  const opened = await rpc.invoke("workflow-prepare-project", {
    mode: "open",
    path: "/open/ok",
  });
  assert.equal(opened.install, null);
  assert.equal(
    host.calls.some((call) => call[0] === "install"),
    false
  );
  await rpc.invoke("workflow-prepare-project", {
    mode: "open",
    path: "/open/old",
  });
  assert.deepEqual(host.calls.find((call) => call[0] === "install")[2], {
    name: undefined,
    update: true,
  });
  const legacy = await rpc.invoke("workflow-prepare-project", {
    mode: "open",
    path: "/open/legacy",
    name: "Legacy",
  });
  assert.equal(legacy.ok, true);
  assert.equal(
    (
      await rpc.invoke("workflow-prepare-project", {
        mode: "open",
        path: "/open/pilot",
      })
    ).code,
    "UNSUPPORTED_FOLDER"
  );
  assert.equal(
    (
      await rpc.invoke("workflow-prepare-project", {
        mode: "open",
        path: "/open/none",
      })
    ).code,
    "FOLDER_MISSING"
  );
  assert.equal(
    (
      await rpc.invoke("workflow-prepare-project", {
        mode: "open",
        path: "/open/fail",
      })
    ).code,
    "HOST_SPAWN"
  );
  const before = added.length;
  const broken = await rpc.invoke("workflow-prepare-project", {
    mode: "open",
    name: "Broken",
    path: "/open/broken",
  });
  assert.equal(broken.code, "GIT_IDENTITY");
  assert.equal(added.length, before);

  // Status and doctor of the active or a named workspace.
  const status = await rpc.invoke("workflow-status", {});
  assert.equal(status.result.root, "/work/one");
  assert.equal(events.at(-1).workspaceId, "w1");
  assert.equal(
    (await rpc.invoke("workflow-status", { workspaceId: "nope" })).code,
    "UNKNOWN_WORKSPACE"
  );
  host.calls.length = 0;
  const doctor = await rpc.invoke("workflow-doctor", {
    fix: true,
    workspaceId: "w2",
  });
  assert.equal(doctor.ok, true);
  assert.deepEqual(host.calls[0], ["doctor", "/work/two", true]);
  assert.equal(events.at(-1).workspaceId, "w2");

  // Autopilot switch and its events.
  assert.equal(
    (await rpc.invoke("workflow-autopilot-get", {})).code,
    "INVALID_REQUEST"
  );
  assert.deepEqual(
    await rpc.invoke("workflow-autopilot-get", { sessionId: "s1" }),
    {
      autopilot: { enabled: false, sessionId: "s1" },
      ok: true,
    }
  );
  assert.equal(
    (
      await rpc.invoke("workflow-autopilot-set", {
        enabled: "yes",
        sessionId: "s1",
      })
    ).code,
    "INVALID_REQUEST"
  );
  assert.deepEqual(
    await rpc.invoke("workflow-autopilot-set", {
      enabled: true,
      sessionId: "s1",
    }),
    {
      autopilot: { enabled: true, sessionId: "s1" },
      ok: true,
    }
  );
  assert.deepEqual(autopilotCalls, [["s1", true]]);
  autopilotListeners[0]({ sessionId: "s1", type: "workflow:autopilot" });
  assert.deepEqual(events.at(-1), {
    sessionId: "s1",
    type: "workflow:autopilot",
  });

  const count = events.length;
  unsubscribe();
  await rpc.invoke("workflow-status", {});
  assert.equal(events.length, count);
} finally {
  await rm(buildDir, { force: true, recursive: true });
}

// CoreRuntimeApi routes the methods and relays the events.
assert.match(apiSource, /CoreProjectWorkflowRpc\.handles\(method\)/u);
assert.match(apiSource, /this\.projectWorkflow\.invoke\(method, payload\)/u);
assert.match(apiSource, /this\.projectWorkflow\.subscribe\(listener\)/u);
assert.match(apiSource, /host: workflowHostFacade/u);
