# Workflow Status Strip Module

## Responsibility

A compact strip above the session surface with the Workflow Kit status of
the active workspace and the autopilot switch of the open session. Core
owns the status and the autopilot; the strip renders them and forwards the
switch.

## Public Facade

`WorkflowStatusStripFacade` (`src/workflow-status-strip-facade.tsx`), props
`{workspaceId, sessionId}`.

## Inputs

- `window.harnessCore.getWorkflowStatus({workspaceId})` — the Kit status
  envelope; `workflow:status` events of the same workspace replace it, and
  every idle `session:turn-state` event asks Core again (the agent may have
  committed).
- `window.harnessCore.getWorkflowAutopilot({sessionId})` — the autopilot
  snapshot; `workflow:autopilot` events of the same session replace it.
- `window.harnessCore.setWorkflowAutopilot({sessionId, enabled})`.

The subscription lives in `workflow-status-state.ts` (`useWorkflowStatus`).

## Outputs

- Nothing when the status failed or the Kit is not installed.
- Scope (`id · status`, objective as the tooltip) or "No active scope";
  the current task (`Task`) or the next task (`Next`); progress
  `done/total`.
- With an open session: the Autopilot switch (`aria-pressed`), "Continuing"
  while an autopilot turn runs, the localized last stop reason
  (`workflow.autopilot.reason.<reason>`, detail as the tooltip, `disabled`
  not shown) and an in-app error when the switch fails.

## Tests

- `src/workflow-status-strip.test.mjs` — bridge calls, event filters,
  installed-only rendering, localized stop reasons and the switch.

## Owned Paths

- `module.md`
- `src/**`
