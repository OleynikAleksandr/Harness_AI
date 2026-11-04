import assert from "node:assert/strict";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
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
const buildDir = await mkdtemp(path.join(tmpdir(), "core-plan-view-build-"));
const fixtureDir = await mkdtemp(path.join(tmpdir(), "core-plan-view-"));
const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function task(id, status, parallelSafe, title = `Task ${id}`) {
  return {
    dependencies: [],
    id,
    kind: "work",
    parallelSafe,
    roundId: "R1",
    status,
    title,
  };
}

function assignment(taskId, status, worktree) {
  return {
    branch: worktree ? `worktree-${taskId}` : null,
    cleanup: null,
    id: `a-${taskId}`,
    integrationCommit: null,
    sourceCommit: null,
    status,
    taskId,
    worktree,
  };
}

function kit(overrides = {}) {
  return {
    command: "status",
    ok: true,
    result: {
      assignments: [],
      currentTask: null,
      execution: null,
      installed: true,
      progress: { done: 1, total: 3 },
      scope: {
        blockedReason: null,
        delivery: "NOT_REQUIRED",
        id: "ship",
        objective: "Ship the plan view",
        status: "ACTIVE",
      },
      tasks: [
        task("E1", "DONE", false),
        task("E2", "IN_PROGRESS", true),
        task("E3", "TODO", false),
      ],
      ...overrides,
    },
  };
}

function session(id, fields = {}) {
  return {
    id,
    sessionKind: "primary",
    updatedAt: "2026-11-04T10:00:00Z",
    workspaceId: "w1",
    ...fields,
  };
}

try {
  for (const file of [
    "core-workflow-plan-view",
    "core-workflow-mode-choice",
    "core-workflow-pause",
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
    transpile("./core-project-workflow-rpc.ts").replace(
      AUTOPILOT_IMPORT,
      "const sessionWorkflowAutopilot = null;\n"
    ),
    "utf8"
  );
  const { buildPlanView, PlanViewSessionWatch } = await import(
    pathToFileURL(path.join(buildDir, "core-workflow-plan-view.js")).href
  );
  const { CoreProjectWorkflowRpc } = await import(
    pathToFileURL(path.join(buildDir, "rpc.js")).href
  );

  // No plan view without a successful status, an installed Kit or a scope.
  assert.equal(
    buildPlanView(
      { code: "X", message: "x", nextAction: null, ok: false },
      "w1",
      []
    ),
    null
  );
  assert.equal(buildPlanView(kit({ installed: false }), "w1", []), null);
  assert.equal(buildPlanView(kit({ scope: null }), "w1", []), null);

  // Sequential mode: no labels, the Kit current task, and the most recently
  // active primary session of the workspace as the owner.
  const sessions = [
    session("old", { updatedAt: "2026-11-04T09:00:00Z" }),
    session("recent", { updatedAt: "2026-11-04T11:00:00Z" }),
    session("child", {
      sessionKind: "subagent",
      updatedAt: "2026-11-04T12:00:00Z",
    }),
    session("creator", {
      sessionPurpose: { profileId: "p", type: "profile-creator" },
      updatedAt: "2026-11-04T13:00:00Z",
    }),
    session("elsewhere", {
      updatedAt: "2026-11-04T14:00:00Z",
      workspaceId: "w2",
    }),
  ];
  const sequential = buildPlanView(
    kit({
      currentTask: { id: "E2" },
      execution: {
        maxWorkers: 1,
        ownerSession: "unknown",
        strategy: "sequential",
      },
    }),
    "w1",
    sessions
  );
  assert.deepEqual(sequential, {
    boundSessionIds: [],
    mode: "sequential",
    objective: "Ship the plan view",
    ownerSessionId: "recent",
    progress: { done: 1, total: 3 },
    rows: [
      {
        current: false,
        executorSessionId: null,
        kind: "work",
        label: null,
        status: "DONE",
        taskId: "E1",
        title: "Task E1",
      },
      {
        current: true,
        executorSessionId: null,
        kind: "work",
        label: null,
        status: "IN_PROGRESS",
        taskId: "E2",
        title: "Task E2",
      },
      {
        current: false,
        executorSessionId: null,
        kind: "work",
        label: null,
        status: "TODO",
        taskId: "E3",
        title: "Task E3",
      },
    ],
    scopeId: "ship",
    status: "ACTIVE",
  });
  // A plan without an execution block is sequential; no sessions, no owner.
  assert.equal(buildPlanView(kit(), "w1", []).mode, "sequential");
  assert.equal(buildPlanView(kit(), "w1", []).ownerSessionId, null);
  // A blocked scope still shows its plan with its state.
  assert.equal(
    buildPlanView(
      kit({
        scope: {
          blockedReason: "x",
          delivery: "NOT_REQUIRED",
          id: "ship",
          objective: "o",
          status: "BLOCKED",
        },
      }),
      "w1",
      []
    ).status,
    "BLOCKED"
  );

  // Orchestrated mode: labels, the recorded owner, executor binding by the
  // real path of the worktree (symlinks, trailing slashes, nested working
  // directories) and the tasks executors work on as current.
  const realWorktree = path.join(fixtureDir, "worktrees", "agent-e2");
  mkdirSync(path.join(realWorktree, "packages", "core"), { recursive: true });
  const alias = path.join(fixtureDir, "alias");
  symlinkSync(path.join(fixtureDir, "worktrees"), alias);
  const otherWorktree = path.join(fixtureDir, "worktrees", "agent-e3");
  mkdirSync(otherWorktree, { recursive: true });
  const orchestratedKit = kit({
    assignments: [
      assignment("E1", "INTEGRATED", null),
      assignment("E2", "RUNNING", `${path.join(alias, "agent-e2")}/`),
      assignment("E3", "ASSIGNED", otherWorktree),
    ],
    execution: {
      maxWorkers: 2,
      ownerSession: "old",
      strategy: "orchestrated",
    },
  });
  const executors = [
    ...sessions,
    session("exec-e2-old", {
      sessionKind: "subagent",
      updatedAt: "2026-11-04T10:30:00Z",
      workingDirectory: realWorktree,
    }),
    session("exec-e2", {
      sessionKind: "subagent",
      updatedAt: "2026-11-04T10:40:00Z",
      workingDirectory: path.join(realWorktree, "packages", "core"),
    }),
    // Same worktree, another workspace: never bound.
    session("exec-foreign", {
      sessionKind: "subagent",
      updatedAt: "2026-11-04T15:00:00Z",
      workingDirectory: realWorktree,
      workspaceId: "w2",
    }),
    // A sibling directory with the worktree name as a prefix: not inside.
    session("exec-prefix", {
      sessionKind: "subagent",
      workingDirectory: `${otherWorktree}-copy`,
    }),
    // A primary session is never an executor.
    session("primary-in-worktree", { workingDirectory: otherWorktree }),
  ];
  const orchestrated = buildPlanView(orchestratedKit, "w1", executors);
  assert.equal(orchestrated.mode, "orchestrated");
  assert.equal(orchestrated.ownerSessionId, "old");
  assert.deepEqual(
    orchestrated.rows.map((row) => [
      row.taskId,
      row.label,
      row.current,
      row.executorSessionId,
    ]),
    [
      ["E1", "sequential", false, null],
      ["E2", "parallel", true, "exec-e2"],
      ["E3", "sequential", true, null],
    ]
  );
  assert.deepEqual(orchestrated.boundSessionIds, ["exec-e2"]);

  // The session watch: a subagent working directory that appears or changes
  // reports its workspace once per quiet period; repeats and primary
  // sessions do not.
  const records = new Map();
  const listeners = [];
  const changes = [];
  const sessionWatch = new PlanViewSessionWatch({
    debounceMs: 40,
    list: () => [...records.values()],
    onChange: (workspaceId) => changes.push(workspaceId),
    subscribe: (listener) => {
      listeners.push(listener);
      return () => listeners.splice(listeners.indexOf(listener), 1);
    },
  });
  const publish = (type, sessionId) => {
    for (const listener of listeners) {
      listener({ payload: { sessionId }, type });
    }
  };
  records.set("p", session("p", { workingDirectory: realWorktree }));
  records.set(
    "x",
    session("x", { sessionKind: "subagent", workingDirectory: realWorktree })
  );
  publish("session:updated", "p");
  publish("session:created", "x");
  publish("session:updated", "x");
  publish("session:turn-state", "x");
  await settle(120);
  assert.deepEqual(changes, ["w1"]);
  publish("session:updated", "x");
  await settle(120);
  assert.deepEqual(changes, ["w1"]);
  records.set(
    "x",
    session("x", { sessionKind: "subagent", workingDirectory: otherWorktree })
  );
  publish("session:updated", "x");
  await settle(120);
  assert.deepEqual(changes, ["w1", "w1"]);
  sessionWatch.close();
  assert.equal(listeners.length, 0);

  // Through the RPC: the status result and every workflow:status event carry
  // the plan view; a new executor working directory re-publishes it without
  // a Kit file change, only for a workspace with a Kit plan.
  const workspaceRoot = path.join(fixtureDir, "project");
  mkdirSync(path.join(workspaceRoot, ".harness", "plans"), { recursive: true });
  writeFileSync(
    path.join(workspaceRoot, ".harness", "plans", "todo-plan.md"),
    "# Plan\n"
  );
  const noPlanRoot = path.join(fixtureDir, "plain");
  mkdirSync(noPlanRoot, { recursive: true });
  const active = { id: "w1", name: "Project", path: workspaceRoot };
  const plain = { id: "w2", name: "Plain", path: noPlanRoot };
  const live = sessions.filter((item) => item.id !== "elsewhere");
  const rpcListeners = [];
  const statusCalls = [];
  const rpc = new CoreProjectWorkflowRpc({
    addWorkspace: () => active,
    autopilot: {
      get: () => null,
      setEnabled: () => null,
      subscribe: () => () => undefined,
    },
    host: {
      status: (root) => {
        statusCalls.push(root);
        return Promise.resolve(orchestratedKit);
      },
      writeRuntimeFile: () => true,
    },
    sessions: {
      get: () => undefined,
      list: () => live,
      send: () => ({ ok: true }),
      subscribe: (listener) => {
        rpcListeners.push(listener);
        return () => undefined;
      },
    },
    watchDebounceMs: 40,
    workspaces: () => ({ active, known: [active, plain] }),
  });
  const events = [];
  rpc.subscribe((event) => events.push(event));
  try {
    const result = await rpc.invoke("workflow-status", {});
    assert.equal(result.ok, true);
    assert.equal(result.result, orchestratedKit.result);
    assert.equal(result.planView.scopeId, "ship");
    assert.equal(result.planView.ownerSessionId, "old");
    assert.deepEqual(result.planView.boundSessionIds, []);
    assert.deepEqual(events.at(-1).planView, result.planView);
    assert.equal(events.at(-1).type, "workflow:status");

    events.length = 0;
    statusCalls.length = 0;
    const executor = session("exec-new", {
      sessionKind: "subagent",
      updatedAt: "2026-11-04T16:00:00Z",
      workingDirectory: realWorktree,
    });
    live.push(executor);
    for (const listener of rpcListeners) {
      listener({ payload: { sessionId: "exec-new" }, type: "session:updated" });
    }
    await settle(150);
    assert.deepEqual(statusCalls, [workspaceRoot]);
    assert.equal(events.length, 1);
    assert.equal(events[0].workspaceId, "w1");
    assert.deepEqual(events[0].planView.boundSessionIds, ["exec-new"]);
    assert.equal(events[0].planView.rows[1].executorSessionId, "exec-new");

    // A workspace without a Kit plan is not re-published.
    events.length = 0;
    live.push(
      session("exec-plain", {
        sessionKind: "subagent",
        workingDirectory: noPlanRoot,
        workspaceId: "w2",
      })
    );
    for (const listener of rpcListeners) {
      listener({
        payload: { sessionId: "exec-plain" },
        type: "session:created",
      });
    }
    await settle(150);
    assert.equal(events.length, 0);
  } finally {
    rpc.close();
  }
} finally {
  await rm(buildDir, { force: true, recursive: true });
  await rm(fixtureDir, { force: true, recursive: true });
}
