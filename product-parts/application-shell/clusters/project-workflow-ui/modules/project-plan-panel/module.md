# Project Plan Panel Module

## Responsibility

The active plan in the left sidebar under the card of its owner session
(spec 10.2 of `docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`),
in both execution modes. Core builds the plan view — scope, progress, mode,
task rows and the executor session bound to each task — and owns the
executor binding; the panel renders that model and forwards the click on an
executor row. It also shows the pause button of the plan, driven only by the
Core `pauseState` of the owner session's autopilot snapshot (spec 4.3 of
`docs/architecture/ReleaseFixes-2026-11-04-3.md`), and forwards the pause to
Core. It matches no sessions, paths or worktrees and derives no pause state
itself.

## Public Facade

`src/project-plan-panel-facade.tsx`:

- `ProjectPlanPanelFacade`, props `{planView, activeSessionId,
  onOpenSession}`;
- `useProjectPlanView(workspaceId)` (defined in
  `src/project-plan-panel-state.ts`) → the Core `WorkflowPlanView` or
  `null`;
- `useWorkflowAutopilot(sessionId | null)` (defined in
  `src/project-plan-pause-state.ts`) → `{autopilot, setPaused}`: the Core
  `WorkflowAutopilotSnapshot` of the session or `null`, and
  `setPaused(paused)` resolving to the Core/Kit failure message or `null`
  (on success the returned snapshot replaces the current one). The panel
  uses it for the owner session; the status strip
  (`workflow-status-strip`) uses it for the open session.

## Inputs

- `window.harnessCore.getWorkflowStatus({workspaceId})` — its result
  carries the Core `planView` (null without a scope or an installed Kit);
  every `workflow:status` event of the same workspace replaces it. Core
  publishes the event on Kit state changes and when an executor session
  reports its working directory, so the panel does not poll.
- `window.harnessCore.getWorkflowAutopilot({sessionId})` for
  `planView.ownerSessionId` (nothing is read without an owner); every
  `workflow:autopilot` event of the same session replaces the snapshot.
- `window.harnessCore.setWorkflowPause({sessionId, paused})` →
  `{ok: true, autopilot}` or the failure `{ok: false, code, message}`.
- `activeSessionId` — the open session; the row of that executor is
  selected.
- `onOpenSession(sessionId)` — the sidebar session-select path
  (`SessionTree.onSelectSession`).

## Outputs

- A `section` labelled "Plan" (`workflow.plan.title`) with a pinned header:
  the scope objective (scope id as the tooltip), the localized scope state
  (`workflow.plan.state.<ACTIVE|BLOCKED>`) and the progress "N of M done"
  (`workflow.plan.progressOf`, `workflow.plan.progressDone`).
- In the header, when the owner snapshot is loaded and Core reports it
  `available`: the pause button by the Core `pauseState` — `running`
  "Pause" (`workflow.plan.pause`), `pausing` "Pausing after the current
  task" (`workflow.plan.pausing`, disabled), `paused` "Continue"
  (`workflow.plan.continue`). A click sends
  `setWorkflowPause({sessionId: ownerSessionId, paused: pauseState ===
  "running"})`; a Core/Kit failure message is shown inline under the button
  (`role="alert"`) until the next click.
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
  executor row); the pause button: the autopilot read and session event
  filter, no button without a snapshot or when not `available`, the label
  and disabled state per `pauseState` (stub hook), the click payloads
  (`true` from `running`, `false` from `paused`, components called
  directly), and the real hook's `setWorkflowPause` requests, the inline
  failure message and the missing bridge.

## Owned Paths

- `module.md`
- `src/**`
