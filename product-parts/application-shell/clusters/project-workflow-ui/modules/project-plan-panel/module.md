# Project Plan Panel Module

## Responsibility

The active plan in the left sidebar under the card of its owner session
(spec 10.2 of `docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`),
in both execution modes. Core builds the plan view — scope, progress, mode,
task rows and the executor session bound to each task — and owns the
executor binding; the panel renders that model and forwards the click on an
executor row. It matches no sessions, paths or worktrees itself.

## Public Facade

`src/project-plan-panel-facade.tsx`:

- `ProjectPlanPanelFacade`, props `{planView, activeSessionId,
  onOpenSession}`;
- `useProjectPlanView(workspaceId)` (defined in
  `src/project-plan-panel-state.ts`) → the Core `WorkflowPlanView` or
  `null`.

## Inputs

- `window.harnessCore.getWorkflowStatus({workspaceId})` — its result
  carries the Core `planView` (null without a scope or an installed Kit);
  every `workflow:status` event of the same workspace replaces it. Core
  publishes the event on Kit state changes and when an executor session
  reports its working directory, so the panel does not poll.
- `activeSessionId` — the open session; the row of that executor is
  selected.
- `onOpenSession(sessionId)` — the sidebar session-select path
  (`SessionTree.onSelectSession`).

## Outputs

- A `section` labelled "Plan" (`workflow.plan.title`) with a pinned header:
  the scope objective (scope id as the tooltip), the localized scope state
  (`workflow.plan.state.<ACTIVE|BLOCKED>`) and the progress "N of M done"
  (`workflow.plan.progressOf`, `workflow.plan.progressDone`).
- A scrollable ordered list of task rows in Core order (rows scroll, the
  header does not, `max-height: 240px`): status icon (`CircleCheck` DONE,
  `CircleDot` IN_PROGRESS, `Circle` TODO, labelled
  `workflow.plan.taskStatus.<status>`), task id, full title (wraps), and the
  Core label "parallel"/"sequential" (`workflow.plan.parallel`,
  `workflow.plan.sequential`) only when Core sets one (orchestrated mode).
- The Core `current` row is highlighted (`is-current`, `aria-current="step"`).
- A row with `executorSessionId` is a `button` (keyboard accessible, tooltip
  `workflow.plan.openExecutor`) that calls `onOpenSession(executorSessionId)`;
  when that executor is the open session the row is selected
  (`is-selected`, `aria-current="page"`). Other rows are plain.
- No native dialogs. Styles are in `src/project-plan-panel.css` on the
  `--pm-*` dark theme tokens and the sidebar tree accent.

## Tests

- `src/project-plan-panel.test.mjs` — the RPC read and the workspace event
  filter, no renderer matching, the sidebar hook mount, the localized keys,
  and a server render (React `renderToStaticMarkup`) of a sequential plan
  (header, state, progress, no labels, current row, status icons) and an
  orchestrated plan (labels, executor rows as buttons, the selected
  executor row).

## Owned Paths

- `module.md`
- `src/**`
