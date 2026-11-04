# Execution Mode Card Module

## Responsibility

The execution mode card of a scope proposal (spec 4.2 of
`docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`) in the chat
of the session that made the proposal. Core builds the card from the Kit
proposal, records the choice and sends it to the agent; the card renders
the Core model and forwards the clicked option.

## Public Facade

`ExecutionModeCardFacade` (`src/execution-mode-card-facade.tsx`), props
`{workspaceId, sessionId}`.

## Inputs

- `window.harnessCore.getWorkflowModeChoice({workspaceId})` — the Core
  card of the workspace or null; `workflow:mode-choice` events of the same
  workspace replace it.
- `window.harnessCore.chooseWorkflowMode({workspaceId, sessionId,
  generation, option})` — the click; `sessionId` and `generation` are the
  card's own values. The Core answer replaces the card; a refusal returns
  its message.

The subscription lives in `src/execution-mode-card-state.ts`
(`useExecutionModeCard`).

## Outputs

- Nothing when there is no card, the open session is not the card's
  owner (`card.sessionId`) or the card is `dismissed`.
- `offered`: the question ("How should the plan be executed?") with the
  scope objective (`title`, scope id as the tooltip); one row per Core
  option in Core order (the recommended one first): localized label, the
  "(recommended)" mark, a description, Core's `reason` under the
  recommended row, and a Choose button (filled `project-workflow-primary`
  for the recommendation, `project-workflow-secondary` otherwise); the
  hint "or write your answer in the chat"; an orange border marks the
  action needed from the user.
- `saving`: neutral border, every button disabled, "Saving the choice...".
- `chosen`: one compact line "Chosen: <option> · sent to the agent".
- Errors in the card (`role="alert"`): Core's `card.error` (a refused
  choice or an unsent message), else the refusal of the last click, or the
  localized `core.bridge.unavailable`. No native dialogs.

Labels come from the localization dictionaries (`workflow.modeCard.*`;
option labels and descriptions by option id). Styles are in
`src/execution-mode-card.css` on the `--pm-*` tokens; the buttons reuse the
cluster styles of `project-workflow-ui.css`.

## Tests

- `src/execution-mode-card.test.mjs` — bridge calls and the event filter,
  owner-only and dismissed rendering, recommended row with mark, reason,
  filled button and hint, saving/chosen states, localized strings, the
  session-window integration and no native dialogs.

## Owned Paths

- `module.md`
- `src/**`
