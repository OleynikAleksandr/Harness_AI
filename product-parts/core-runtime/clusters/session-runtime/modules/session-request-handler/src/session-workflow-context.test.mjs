import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const HOST_IMPORT_PATTERN =
  /import \{\s*type WorkflowHostFacade,\s*workflowHostFacade,\s*\} from "[^"]+";\n/u;
const source = readFileSync(
  new URL("./session-workflow-context.ts", import.meta.url),
  "utf8"
);
assert.match(source, HOST_IMPORT_PATTERN);
const compiled = ts.transpileModule(
  source.replace(HOST_IMPORT_PATTERN, "const workflowHostFacade = null;\n"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const lifecycleSource = readFileSync(
  new URL("./session-provider-binding-lifecycle.ts", import.meta.url),
  "utf8"
);
const buildDir = await mkdtemp(
  path.join(tmpdir(), "session-workflow-context-")
);

function fakeHost({ installed = true, outcome, throws = false } = {}) {
  const calls = [];
  return {
    bundle: (root) =>
      installed
        ? { file: `${root}/kit`, source: "project" }
        : { file: "/app/kit", source: "app" },
    calls,
    run: (args, options) => {
      calls.push([args, options]);
      if (throws) {
        return Promise.reject(new Error("boom"));
      }
      return Promise.resolve(
        outcome ?? {
          command: "recover",
          ok: true,
          result: { text: "# Workflow recovery\nTask T1" },
        }
      );
    },
  };
}

try {
  writeFileSync(path.join(buildDir, "context.js"), compiled, "utf8");
  const { resolveWorkflowWorkspaceContext } = await import(
    pathToFileURL(path.join(buildDir, "context.js")).href
  );
  const session = {
    id: "s1",
    providerId: "claude",
    workspacePath: "/work/demo",
  };

  const startHost = fakeHost();
  assert.equal(
    await resolveWorkflowWorkspaceContext(session, startHost),
    "# Workflow recovery\nTask T1"
  );
  assert.deepEqual(startHost.calls, [
    [
      ["recover", "--event", "startup"],
      { root: "/work/demo", timeoutMs: 20_000 },
    ],
  ]);
  const resumeHost = fakeHost();
  await resolveWorkflowWorkspaceContext(
    { ...session, providerSessionId: "p1" },
    resumeHost
  );
  assert.deepEqual(resumeHost.calls[0][0], ["recover", "--event", "resume"]);

  // No context: no Kit, subagent, Profile Creator, no workspace, failures.
  for (const [candidate, host] of [
    [session, fakeHost({ installed: false })],
    [{ ...session, sessionKind: "subagent" }, fakeHost()],
    [{ ...session, sessionPurpose: { kind: "profile-creator" } }, fakeHost()],
    [{ ...session, workspacePath: undefined }, fakeHost()],
    [
      session,
      fakeHost({
        outcome: {
          code: "HOST_TIMEOUT",
          message: "x",
          nextAction: null,
          ok: false,
        },
      }),
    ],
    [
      session,
      fakeHost({
        outcome: { command: "recover", ok: true, result: { text: "  " } },
      }),
    ],
    [session, fakeHost({ throws: true })],
  ]) {
    assert.equal(
      await resolveWorkflowWorkspaceContext(candidate, host),
      undefined
    );
  }
} finally {
  await rm(buildDir, { force: true, recursive: true });
}

// The binding passes the context to both create and resume through the
// shared start options.
assert.match(
  lifecycleSource,
  /this\.deps\.resolveWorkspaceContext \?\? resolveWorkflowWorkspaceContext/u
);
assert.match(
  lifecycleSource,
  /\.\.\.\(workspaceContext \? \{ workspaceContext \} : \{\}\)/u
);
assert.match(lifecycleSource, /session\.workspacePath,\s*startOptions\s*\)/u);
assert.match(
  lifecycleSource,
  /createSession\(session\.workspacePath, startOptions\)/u
);
