import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// `workflow-identity-set` and the repeated `workflow-prepare-project`
// (spec section 1 of ReleaseFixes-2026-11-04-2.md). The other routes are
// tested in core-project-workflow-rpc.test.mjs.
const AUTOPILOT_IMPORT =
  /import \{[^}]*\} from "[^"]*session-workflow-autopilot\.js";\n/u;
const source = readFileSync(
  new URL("./core-project-workflow-rpc.ts", import.meta.url),
  "utf8"
).replace(AUTOPILOT_IMPORT, "const sessionWorkflowAutopilot = null;\n");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
// Minimal stand-ins for the mode card, plan view and watchers.
const STUBS = {
  "core-workflow-mode-choice.js":
    "export class CoreWorkflowModeChoice { constructor() {} }\n",
  "core-workflow-plan-view.js":
    "export const buildPlanView = () => null;\nexport class PlanViewSessionWatch { close() {} }\n",
  "core-workflow-watch.js":
    "export class CoreWorkflowWatch { sync() {} close() {} }\n",
};
const buildDir = await mkdtemp(path.join(tmpdir(), "project-workflow-id-"));

const ok = (result) => ({ command: "x", ok: true, result });

/** A fake host whose Kit refuses to install until a global identity is set. */
function fakeHost() {
  const calls = [];
  const identity = { value: null };
  return {
    calls,
    identity,
    inspect: (folder) =>
      Promise.resolve(
        ok({
          action: "install",
          nestedIn: null,
          path: folder,
          state: "GIT_NO_KIT",
        })
      ),
    install: (folder, options) => {
      calls.push(["install", folder, options]);
      return Promise.resolve(
        identity.value
          ? ok({ commit: { sha: "abc" }, root: folder })
          : {
              code: "GIT_IDENTITY_REQUIRED",
              message:
                "The Workflow Kit needs a real git name and email for its commits; none is set. Nothing was written.",
              nextAction: "Run once: `git config --global ...`",
              ok: false,
            }
      );
    },
    setIdentity: (value) => {
      calls.push(["identity", value]);
      if (value.email.includes("“")) {
        return Promise.resolve({
          code: "GIT_IDENTITY_INVALID",
          details: { field: "email" },
          message: "The git email must look like name@domain.tld.",
          nextAction: null,
          ok: false,
        });
      }
      identity.value = value;
      return Promise.resolve(ok({ ...value, scope: "global" }));
    },
    status: (root) => Promise.resolve(ok({ installed: true, root })),
    writeRuntimeFile: () => true,
  };
}

try {
  writeFileSync(path.join(buildDir, "rpc.js"), compiled, "utf8");
  for (const [file, text] of Object.entries(STUBS)) {
    writeFileSync(path.join(buildDir, file), text, "utf8");
  }
  const { CoreProjectWorkflowRpc } = await import(
    pathToFileURL(path.join(buildDir, "rpc.js")).href
  );
  assert.equal(CoreProjectWorkflowRpc.handles("workflow-identity-set"), true);
  const host = fakeHost();
  const added = [];
  const workspace = { id: "w1", name: "One", path: "/work/one" };
  const rpc = new CoreProjectWorkflowRpc({
    addWorkspace: (workspacePath) => {
      added.push(workspacePath);
      return { id: `id:${workspacePath}`, name: "x", path: workspacePath };
    },
    autopilot: {
      get: () => null,
      setEnabled: () => null,
      subscribe: () => undefined,
    },
    host,
    sessions: {
      get: () => null,
      list: () => [],
      subscribe: () => () => undefined,
    },
    workspaces: () => ({ active: workspace, known: [workspace] }),
  });

  // Without a global identity the preparation stops and registers nothing.
  const request = { mode: "open", path: "/open/unsigned" };
  const required = await rpc.invoke("workflow-prepare-project", request);
  assert.equal(required.code, "GIT_IDENTITY_REQUIRED");
  assert.deepEqual(added, []);

  // Core checks only the payload shape; the Kit validates the values and
  // its envelope is returned as is.
  for (const payload of [
    { name: "Real Person" },
    { email: 1, name: "x" },
    null,
  ]) {
    assert.equal(
      (await rpc.invoke("workflow-identity-set", payload)).code,
      "INVALID_REQUEST"
    );
  }
  const quoted = await rpc.invoke("workflow-identity-set", {
    email: "“real@harness-ai.test”",
    name: "Real Person",
  });
  assert.deepEqual(
    { code: quoted.code, field: quoted.details.field, ok: quoted.ok },
    { code: "GIT_IDENTITY_INVALID", field: "email", ok: false }
  );
  assert.equal(host.identity.value, null);
  const saved = await rpc.invoke("workflow-identity-set", {
    email: "real@harness-ai.test",
    name: "Real Person",
  });
  assert.deepEqual(saved, {
    command: "x",
    ok: true,
    result: {
      email: "real@harness-ai.test",
      name: "Real Person",
      scope: "global",
    },
  });
  assert.deepEqual(host.calls.at(-1), [
    "identity",
    { email: "real@harness-ai.test", name: "Real Person" },
  ]);

  // The client repeats the same request; now the Kit installs and Core
  // registers the workspace.
  const repeated = await rpc.invoke("workflow-prepare-project", request);
  assert.equal(repeated.ok, true, JSON.stringify(repeated));
  assert.deepEqual(added, ["/open/unsigned"]);
  assert.deepEqual(
    host.calls
      .filter(([kind]) => kind === "install")
      .map(([, folder]) => folder),
    ["/open/unsigned", "/open/unsigned"]
  );
  console.log("core project workflow identity tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
