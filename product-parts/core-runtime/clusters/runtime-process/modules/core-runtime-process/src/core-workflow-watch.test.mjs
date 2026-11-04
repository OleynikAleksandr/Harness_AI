import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const transpile = (file) =>
  ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const AUTOPILOT_IMPORT =
  /import \{[^}]*\} from "[^"]*session-workflow-autopilot\.js";\n/u;
const buildDir = await mkdtemp(path.join(tmpdir(), "core-workflow-watch-"));
const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  writeFileSync(
    path.join(buildDir, "core-workflow-watch.js"),
    transpile("./core-workflow-watch.ts"),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "core-workflow-mode-choice.js"),
    transpile("./core-workflow-mode-choice.ts"),
    "utf8"
  );
  const rpcSource = readFileSync(
    new URL("./core-project-workflow-rpc.ts", import.meta.url),
    "utf8"
  );
  assert.match(rpcSource, AUTOPILOT_IMPORT);
  writeFileSync(
    path.join(buildDir, "rpc.js"),
    ts.transpileModule(
      rpcSource.replace(
        AUTOPILOT_IMPORT,
        "const sessionWorkflowAutopilot = null;\n"
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      }
    ).outputText,
    "utf8"
  );
  const { CoreWorkflowWatch } = await import(
    pathToFileURL(path.join(buildDir, "core-workflow-watch.js")).href
  );
  const { CoreProjectWorkflowRpc } = await import(
    pathToFileURL(path.join(buildDir, "rpc.js")).href
  );
  const write = (root, name, text = "{}\n") => {
    const file = path.join(root, ...name.split("/"));
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
  };
  const project = (name, installed = true) => {
    const root = path.join(buildDir, name);
    mkdirSync(path.join(root, ".harness", "workflow"), { recursive: true });
    if (installed) {
      write(root, ".harness/plans/todo-plan.md", "# Plan\n");
    }
    return root;
  };
  const kit = project("kit");
  const bare = project("bare", false);
  const changes = [];
  const watcher = new CoreWorkflowWatch({
    debounceMs: 150,
    onChange: (id) => changes.push(id),
  });
  /**
   * Waits for `count` changes and the quiet period. A directory created
   * together with its file may be reported once more when the new watch
   * sees the file, so `atLeast` accepts extra reports.
   */
  const expectChanges = async (count, label, atLeast = false) => {
    for (let index = 0; index < 100 && changes.length < count; index += 1) {
      await settle(20);
    }
    await settle(400);
    if (atLeast) {
      assert.ok(changes.length >= count, label);
    } else {
      assert.equal(changes.length, count, label);
    }
  };
  const reset = async () => {
    // macOS may still report files created just before a watch started.
    await settle(400);
    changes.length = 0;
  };

  try {
    watcher.sync([
      { id: "kit", path: kit },
      { id: "bare", path: bare },
    ]);
    await reset();

    // A workspace without the Kit is not watched.
    write(bare, ".harness/workflow/local/scope-proposal.json");
    await settle(200);
    assert.deepEqual(changes, []);

    // The local directory does not exist yet: its creation re-arms the watch.
    write(kit, ".harness/workflow/local/assignments/a.json");
    await expectChanges(1, "local directory created", true);
    assert.deepEqual([...new Set(changes)], ["kit"]);
    await reset();

    // A burst of changes is published once (debounced).
    write(kit, ".harness/workflow/local/assignments/a.json", '{"v":2}\n');
    write(kit, ".harness/workflow/local/assignments/b.json");
    write(kit, ".harness/plans/todo-plan.md", "# Plan\n\nrevision 2\n");
    await expectChanges(1, "debounced burst");

    // The integration journal and the proposal count, other local files do not.
    await reset();
    write(kit, ".harness/workflow/local/integration.json");
    await expectChanges(1, "integration journal");
    await reset();
    write(kit, ".harness/workflow/local/scope-proposal.json");
    await expectChanges(1, "scope proposal");
    await reset();
    write(kit, ".harness/workflow/local/kit.lock", "lock\n");
    write(kit, ".harness/workflow/local/runtime", "node\n");
    write(kit, ".harness/plans/archive/old.md", "# Old\n");
    await settle(250);
    assert.deepEqual(changes, [], "unrelated files");

    // The local directory removed and created again: still watched.
    rmSync(path.join(kit, ".harness", "workflow", "local"), {
      force: true,
      recursive: true,
    });
    await reset();
    write(kit, ".harness/workflow/local/integration.json");
    await expectChanges(1, "local directory re-created", true);

    // A Kit installed later is watched after the next sync.
    write(bare, ".harness/plans/todo-plan.md", "# Plan\n");
    watcher.sync([
      { id: "kit", path: kit },
      { id: "bare", path: bare },
    ]);
    await reset();
    write(bare, ".harness/plans/todo-plan.md", "# Plan\n\nrevision 2\n");
    await expectChanges(1, "installed later");
    assert.deepEqual(changes, ["bare"]);

    // Removed from the known workspaces: watching stops.
    watcher.sync([{ id: "bare", path: bare }]);
    await reset();
    write(kit, ".harness/plans/todo-plan.md", "# Plan\n\nrevision 3\n");
    await settle(250);
    assert.deepEqual(changes, [], "removed workspace");

    // Close stops everything.
    watcher.close();
    write(bare, ".harness/plans/todo-plan.md", "# Plan\n\nrevision 3\n");
    await settle(250);
    assert.deepEqual(changes, [], "closed");
  } finally {
    watcher.close();
  }

  // Through the RPC: a plan change publishes workflow:status with the Kit
  // status, without a request; nothing after the workspace is removed.
  const watched = { id: "w3", name: "Watched", path: project("rpc") };
  const planFile = path.join(watched.path, ".harness", "plans", "todo-plan.md");
  let known = [watched];
  const statusCalls = [];
  const rpc = new CoreProjectWorkflowRpc({
    addWorkspace: () => watched,
    autopilot: {
      get: () => null,
      setEnabled: () => null,
      subscribe: () => () => undefined,
    },
    host: {
      status: (root) => {
        statusCalls.push(root);
        return Promise.resolve({
          command: "status",
          ok: true,
          result: { root },
        });
      },
    },
    sessions: {
      get: () => undefined,
      send: () => ({ ok: true }),
      subscribe: () => () => undefined,
    },
    watchDebounceMs: 150,
    workspaces: () => ({ active: watched, known }),
  });
  const events = [];
  rpc.subscribe((event) => events.push(event));
  try {
    rpc.watchWorkspaces();
    await reset();
    events.length = 0;
    writeFileSync(planFile, "# Plan\n\nrevision 2\n");
    for (let index = 0; index < 100 && events.length === 0; index += 1) {
      await settle(20);
    }
    await settle(400);
    assert.deepEqual(events, [
      {
        path: watched.path,
        status: { command: "status", ok: true, result: { root: watched.path } },
        type: "workflow:status",
        workspaceId: "w3",
      },
    ]);
    known = [];
    rpc.watchWorkspaces();
    writeFileSync(planFile, "# Plan\n\nrevision 3\n");
    await settle(500);
    assert.equal(events.length, 1);
    assert.ok(statusCalls.every((root) => root === watched.path));
  } finally {
    rpc.close();
  }

  // CoreRuntimeApi: watchers follow the restored registry, every registry
  // change and the shutdown request.
  const apiSource = readFileSync(
    new URL("./core-runtime-api.ts", import.meta.url),
    "utf8"
  );
  assert.match(
    apiSource,
    /this\.restoreState\(\);\n\s+this\.projectWorkflow\.watchWorkspaces\(\);/u
  );
  assert.match(
    apiSource,
    /this\.workspaces\.invoke\(method, payload\);[\s\S]{0,200}this\.projectWorkflow\.watchWorkspaces\(\)/u
  );
  assert.match(
    apiSource,
    /shutdown\(\): void \{\n\s+this\.projectWorkflow\.close\(\);/u
  );
  assert.match(
    readFileSync(
      new URL("./core-runtime-process-entry.ts", import.meta.url),
      "utf8"
    ),
    /onShutdown: \(\) => \{\n\s+coreRuntimeApi\.shutdown\(\);/u
  );
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
