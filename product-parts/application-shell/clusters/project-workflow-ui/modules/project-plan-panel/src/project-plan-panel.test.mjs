import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const LOCALIZATION_IMPORT =
  /from "[^"]*browser-localization-provider-facade\.js"/u;
const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const facadeSource = read("./project-plan-panel-facade.tsx");
const stateSource = read("./project-plan-panel-state.ts");
const pauseSource = read("./project-plan-pause-state.ts");
const cssSource = read("./project-plan-panel.css");
const sidebarSource = read(
  "../../../../session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx"
);
const dictionarySource = read(
  "../../../../../../core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts"
);

// The plan view comes from Core: the status RPC, then workflow:status events
// of the same workspace. The renderer matches nothing itself.
assert.match(
  stateSource,
  /window\.harnessCore\s*\?\.getWorkflowStatus\(\{ workspaceId \}\)/u
);
assert.match(stateSource, /setPlanView\(result\.planView\)/u);
assert.match(
  stateSource,
  /event\.type === "workflow:status" &&\s*event\.workspaceId === workspaceId/u
);
assert.match(stateSource, /setPlanView\(event\.planView \?\? null\)/u);
assert.doesNotMatch(facadeSource, /workingDirectory|worktree|assignments/u);
assert.doesNotMatch(stateSource, /workingDirectory|worktree|assignments/u);
assert.doesNotMatch(facadeSource, /window\.(alert|confirm|prompt)/u);
// The pause button reads only the Core autopilot snapshot of the plan's
// owner session and forwards the pause to Core; it derives nothing itself.
assert.match(
  pauseSource,
  /window\.harnessCore\s*\?\.getWorkflowAutopilot\(\{ sessionId \}\)/u
);
assert.match(
  pauseSource,
  /event\.type === "workflow:autopilot" &&\s*event\.sessionId === sessionId/u
);
assert.match(
  pauseSource,
  /setWorkflowPause\(\{\s*paused,\s*sessionId,\s*\}\)/u
);
assert.match(facadeSource, /useWorkflowAutopilot\(ownerSessionId\)/u);
assert.match(
  facadeSource,
  /<PlanPauseButton ownerSessionId=\{planView\.ownerSessionId\} t=\{t\} \/>/u
);
assert.match(
  facadeSource,
  /export \{ useWorkflowAutopilot \} from "\.\/project-plan-pause-state\.js";/u
);
assert.doesNotMatch(
  facadeSource + pauseSource,
  /setWorkflowAutopilot|IN_PROGRESS"\s*\?|scripts\/workflow/u
);
// The sidebar mounts the hook for its workspace.
assert.match(sidebarSource, /useProjectPlanView\(workspace\.id\)/u);
// Pinned header, scrolling rows, dark theme tokens.
assert.match(cssSource, /\.project-plan-rows \{[^}]*overflow-y: auto/u);
assert.match(cssSource, /var\(--pm-bg-panel\)/u);
for (const key of [
  "workflow.plan.title",
  "workflow.plan.parallel",
  "workflow.plan.sequential",
  "workflow.plan.progressOf",
  "workflow.plan.progressDone",
  "workflow.plan.state.ACTIVE",
  "workflow.plan.state.BLOCKED",
  "workflow.plan.taskStatus.DONE",
  "workflow.plan.taskStatus.IN_PROGRESS",
  "workflow.plan.taskStatus.TODO",
  "workflow.plan.openExecutor",
  "workflow.plan.pause",
  "workflow.plan.pausing",
  "workflow.plan.continue",
  "workflow.autopilot.reason.paused",
]) {
  assert.ok(dictionarySource.includes(`"${key}":`), key);
}

// Render the facade with React's server renderer.
const require = createRequire(import.meta.url);
const resolved = (name) => pathToFileURL(require.resolve(name)).href;
const buildDir = await mkdtemp(path.join(tmpdir(), "project-plan-panel-"));
const compile = (source, reactUrl = resolved("react")) =>
  ts
    .transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    })
    .outputText.replace(
      /from "(react|react\/jsx-runtime|lucide-react)"/gu,
      (_m, name) => `from "${name === "react" ? reactUrl : resolved(name)}"`
    )
    .replace(/import "\.\/[^"]+\.css";\n/gu, "")
    .replace(LOCALIZATION_IMPORT, 'from "./localization.js"');
try {
  writeFileSync(
    path.join(buildDir, "localization.js"),
    "export const useBrowserLocalization = () => ({ t: (_c, _k, fallback) => fallback });\n"
  );
  writeFileSync(
    path.join(buildDir, "project-plan-panel-state.js"),
    compile(stateSource)
  );
  // Hooks without a renderer: state keeps its initial value, effects are
  // skipped. Used to call components and the real pause hook directly.
  const fakeReact = pathToFileURL(path.join(buildDir, "fake-react.js")).href;
  writeFileSync(
    path.join(buildDir, "fake-react.js"),
    "export const useState = (value) => [value, () => undefined];\nexport const useEffect = () => undefined;\n"
  );
  writeFileSync(
    path.join(buildDir, "real-pause-state.js"),
    compile(pauseSource, fakeReact)
  );
  // The facade gets a stub pause hook driven by the test.
  writeFileSync(
    path.join(buildDir, "project-plan-pause-state.js"),
    "export const useWorkflowAutopilot = (sessionId) => globalThis.pauseStub(sessionId);\n"
  );
  writeFileSync(path.join(buildDir, "facade.js"), compile(facadeSource));
  writeFileSync(
    path.join(buildDir, "facade-direct.js"),
    compile(facadeSource, fakeReact)
  );
  const pauseCalls = { owners: [], paused: [] };
  let pauseSnapshot = null;
  const pauseFailure = null;
  globalThis.pauseStub = (sessionId) => {
    pauseCalls.owners.push(sessionId);
    return {
      autopilot: pauseSnapshot,
      setPaused: (paused) => {
        pauseCalls.paused.push(paused);
        return Promise.resolve(pauseFailure);
      },
    };
  };
  const { ProjectPlanPanelFacade } = await import(
    pathToFileURL(path.join(buildDir, "facade.js")).href
  );
  const { createElement } = await import(resolved("react"));
  const { renderToStaticMarkup } = await import(resolved("react-dom/server"));
  const opened = [];
  const row = (taskId, status, fields = {}) => ({
    current: false,
    executorSessionId: null,
    kind: "work",
    label: null,
    status,
    taskId,
    title: `Title ${taskId}`,
    ...fields,
  });
  const render = (planView, activeSessionId = "owner") =>
    renderToStaticMarkup(
      createElement(ProjectPlanPanelFacade, {
        activeSessionId,
        onOpenSession: (id) => opened.push(id),
        planView,
      })
    );

  // Sequential: header with objective, state and progress; no labels; the
  // current task highlighted; no clickable rows.
  const sequential = render({
    boundSessionIds: [],
    mode: "sequential",
    objective: "Ship the plan",
    ownerSessionId: "owner",
    progress: { done: 1, total: 3 },
    rows: [
      row("E1", "DONE"),
      row("E2", "IN_PROGRESS", { current: true }),
      row("E3", "TODO"),
    ],
    scopeId: "ship",
    status: "ACTIVE",
  });
  assert.match(sequential, /<strong title="ship">Ship the plan<\/strong>/u);
  assert.match(sequential, /Active · 1 of 3 done/u);
  assert.match(sequential, /aria-label="Plan"/u);
  assert.doesNotMatch(sequential, /parallel|sequential<\/small>|<button/u);
  assert.match(
    sequential,
    /aria-current="step" class="project-plan-row is-current">[\s\S]*?E2<\/span><span class="project-plan-row-title">Title E2/u
  );
  assert.match(sequential, /aria-label="Done"/u);
  assert.match(sequential, /aria-label="In progress"/u);
  assert.match(sequential, /aria-label="To do"/u);

  // Orchestrated: labels, executor rows are buttons, the open executor row
  // is selected.
  const orchestrated = render(
    {
      boundSessionIds: ["exec-2", "exec-3"],
      mode: "orchestrated",
      objective: "Ship the plan",
      ownerSessionId: "owner",
      progress: { done: 0, total: 3 },
      rows: [
        row("E1", "TODO", { label: "sequential" }),
        row("E2", "TODO", {
          current: true,
          executorSessionId: "exec-2",
          label: "parallel",
        }),
        row("E3", "TODO", { executorSessionId: "exec-3", label: "parallel" }),
      ],
      scopeId: "ship",
      status: "BLOCKED",
    },
    "exec-3"
  );
  assert.match(orchestrated, /Blocked · 0 of 3 done/u);
  assert.equal(orchestrated.match(/<button/gu)?.length, 2);
  assert.match(
    orchestrated,
    /<button class="project-plan-row is-current is-link" title="Open the executor session" type="button">/u
  );
  assert.match(
    orchestrated,
    /<button aria-current="page" class="project-plan-row is-link is-selected"[^>]*>[\s\S]*?E3/u
  );
  assert.equal(
    orchestrated.match(/project-plan-row-label">parallel</gu)?.length,
    2
  );
  assert.equal(
    orchestrated.match(/project-plan-row-label">sequential</gu)?.length,
    1
  );
  // A click opens the executor session through the given select path.
  assert.match(facadeSource, /onClick=\{\(\) => onOpenSession\(executor\)\}/u);
  assert.equal(opened.length, 0);

  // Pause button: one label per Core pauseState of the owner session.
  const plan = {
    boundSessionIds: [],
    mode: "sequential",
    objective: "Ship the plan",
    ownerSessionId: "owner",
    progress: { done: 1, total: 3 },
    rows: [row("E1", "DONE"), row("E2", "IN_PROGRESS", { current: true })],
    scopeId: "ship",
    status: "ACTIVE",
  };
  const snapshot = (pauseState, fields = {}) => ({
    available: true,
    continues: 0,
    enabled: true,
    lastDecision: null,
    maxContinues: 20,
    pauseState,
    running: false,
    sessionId: "owner",
    ...fields,
  });
  pauseCalls.owners.length = 0;
  pauseSnapshot = null;
  assert.doesNotMatch(render(plan), /project-plan-pause/u);
  assert.deepEqual(pauseCalls.owners, ["owner"]);
  pauseSnapshot = snapshot("running", { available: false });
  assert.doesNotMatch(render(plan), /project-plan-pause/u);
  pauseSnapshot = snapshot("running");
  assert.match(
    render(plan),
    /<button class="project-plan-pause-button is-running" type="button"><svg[^>]*>[\s\S]*?<\/svg>Pause<\/button>/u
  );
  pauseSnapshot = snapshot("pausing");
  assert.match(
    render(plan),
    /<button class="project-plan-pause-button is-pausing" disabled="" type="button">[\s\S]*?Pausing after the current task<\/button>/u
  );
  pauseSnapshot = snapshot("paused");
  assert.match(
    render(plan),
    /<button class="project-plan-pause-button is-paused" type="button">[\s\S]*?Continue<\/button>/u
  );
  // Without an owner session no snapshot is read for anyone.
  pauseCalls.owners.length = 0;
  pauseSnapshot = null;
  render({ ...plan, ownerSessionId: null });
  assert.deepEqual(pauseCalls.owners, [null]);

  // Click payloads: call the components directly (no DOM in node).
  const direct = await import(
    pathToFileURL(path.join(buildDir, "facade-direct.js")).href
  );
  const findElement = (node, match) => {
    if (!node || typeof node !== "object") {
      return null;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findElement(item, match);
        if (found) {
          return found;
        }
      }
      return null;
    }
    if (match(node)) {
      return node;
    }
    return findElement(node.props?.children, match);
  };
  const clickPause = (pauseState) => {
    pauseSnapshot = snapshot(pauseState);
    const tree = direct.ProjectPlanPanelFacade({
      activeSessionId: "owner",
      onOpenSession: () => undefined,
      planView: plan,
    });
    const slot = findElement(
      tree,
      (node) => node.type?.name === "PlanPauseButton"
    );
    assert.equal(slot.props.ownerSessionId, "owner");
    const button = findElement(
      slot.type(slot.props),
      (node) => node.type === "button"
    );
    button.props.onClick();
    return button;
  };
  pauseCalls.paused.length = 0;
  clickPause("running");
  clickPause("paused");
  assert.deepEqual(pauseCalls.paused, [true, false]);
  assert.equal(clickPause("pausing").props.disabled, true);

  // The real hook sends {sessionId, paused} to Core and returns the Core/Kit
  // failure message for the inline error; a success keeps no error.
  // Renamed: called outside a renderer on purpose (fake React).
  const { useWorkflowAutopilot: callPauseHook } = await import(
    pathToFileURL(path.join(buildDir, "real-pause-state.js")).href
  );
  const requests = [];
  let reply = { autopilot: snapshot("pausing"), ok: true };
  globalThis.window = {
    harnessCore: {
      setWorkflowPause: (request) => {
        requests.push(request);
        return Promise.resolve(reply);
      },
    },
  };
  const hook = callPauseHook("owner");
  assert.equal(hook.autopilot, null);
  assert.equal(await hook.setPaused(true), null);
  reply = {
    code: "WORKFLOW_PAUSED",
    message: "The scope is paused.",
    ok: false,
  };
  assert.equal(await hook.setPaused(false), "The scope is paused.");
  assert.deepEqual(requests, [
    { paused: true, sessionId: "owner" },
    { paused: false, sessionId: "owner" },
  ]);
  globalThis.window = {};
  assert.equal(
    await hook.setPaused(true),
    "Core runtime bridge is unavailable."
  );
  assert.equal(await callPauseHook(null).setPaused(true), null);
  globalThis.window = undefined;
} finally {
  await rm(buildDir, { force: true, recursive: true });
}

assert.equal(facadeSource.split("\n").length <= 500, true);
assert.match(cssSource, /\.project-plan-pause-button:disabled \{/u);
