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
]) {
  assert.ok(dictionarySource.includes(`"${key}":`), key);
}

// Render the facade with React's server renderer.
const require = createRequire(import.meta.url);
const resolved = (name) => pathToFileURL(require.resolve(name)).href;
const buildDir = await mkdtemp(path.join(tmpdir(), "project-plan-panel-"));
const compile = (source) =>
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
      (_m, name) => `from "${resolved(name)}"`
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
  writeFileSync(path.join(buildDir, "facade.js"), compile(facadeSource));
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
} finally {
  await rm(buildDir, { force: true, recursive: true });
}

assert.equal(facadeSource.split("\n").length <= 500, true);
