# Workflow Status Strip Module

## Responsibility

A compact strip above the session surface with the Workflow Kit status of
the active workspace and the last autopilot decision of the open session.
Core owns the status and the autopilot; the strip only renders them. It has
no autopilot switch: the autopilot is on by default in Core and the pause
button lives in the sidebar plan panel (`project-plan-panel`).

## Public Facade

`WorkflowStatusStripFacade` (`src/workflow-status-strip-facade.tsx`), props
`{workspaceId, sessionId}`.

## Inputs

- `window.harnessCore.getWorkflowStatus({workspaceId})` — the Kit status
  envelope; `workflow:status` events of the same workspace replace it, and
  every idle `session:turn-state` event asks Core again (the agent may have
  committed).
- The Core autopilot snapshot of the open session through
  `useWorkflowAutopilot(sessionId)` of the `project-plan-panel` facade
  (`getWorkflowAutopilot`, replaced by `workflow:autopilot` events of the
  same session).

The status subscription lives in `workflow-status-state.ts`
(`useWorkflowStatus(workspaceId)`).

## Outputs

- Nothing when the status failed or the Kit is not installed.
- Scope (`id · status`, objective as the tooltip) or "No active scope";
  the current task (`Task`) or the next task (`Next`); progress
  `done/total`.
- With an open session that Core reports as `available` for the
  autopilot, a read-only state: "Continuing" (`workflow.strip.continuing`)
  while an autopilot turn runs, otherwise the localized last stop reason
  (`workflow.autopilot.reason.<reason>`, e.g. `paused`, detail as the
  tooltip, `disabled` not shown).

## Tests

- `src/workflow-status-strip.test.mjs` — bridge calls, event filters, the
  autopilot hook of the plan panel, installed-only rendering, localized
  stop reasons, and no switch (no button, bridge setter, label or CSS).

## Owned Paths

- `module.md`
- `src/**`
