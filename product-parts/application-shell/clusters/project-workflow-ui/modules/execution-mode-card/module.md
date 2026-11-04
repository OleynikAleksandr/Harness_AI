# Execution Mode Card Module

## Responsibility

The execution mode card of a scope proposal (spec 4.2 of
`docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`) in the left
sidebar, under the card of the session that made the proposal, in the slot
where the plan appears after the choice
(`docs/architecture/ReleaseFixes-2026-11-04-2.md`, section 3). Core builds
the card from the Kit proposal, records the choice and sends it to the
agent; the card renders the Core model and forwards the clicked option.

## Public Facade

`src/execution-mode-card-facade.tsx`:

- `ExecutionModeCardFacade`, props `{card, onChoose}` — the Core card and
  the click route; the sidebar tree (`session-sidebar`) mounts it only
  under the card of the owner session (`card.sessionId`);
- `useExecutionModeCard(workspaceId)` (defined in
  `src/execution-mode-card-state.ts`) → `{card, choose}`, the Core card of
  the workspace or null and the click route; its type is
  `ExecutionModeChoice`. The sidebar facade calls it once per workspace.

## Inputs

- `window.harnessCore.getWorkflowModeChoice({workspaceId})` — the Core
  card of the workspace or null; `workflow:mode-choice` events of the same
  workspace replace it.
- `window.harnessCore.chooseWorkflowMode({workspaceId, sessionId,
  generation, option})` — the click (`choose`, passed as `onChoose`);
  `sessionId` and `generation` are the card's own values. The Core answer
  replaces the card; a refusal returns its message.

## Outputs

- Nothing for a `dismissed` card. The placement (owner only, plan hidden
  while the card waits for the choice) belongs to the sidebar tree.
- `offered`: the question ("How should the plan be executed?") with the
  scope objective (`title`, scope id as the tooltip); one row per Core
  option in Core order (the recommended one first): localized label, the
  "(recommended)" mark, a description, Core's `reason` under the
  recommended row, and a Choose button (filled `project-workflow-primary`
  for the recommendation, `project-workflow-secondary` otherwise); the
  hint "or write your answer in the chat"; an orange border marks the
  action needed from the user.
- `saving`: neutral border, every button disabled, "Saving the choice...".
- `chosen`: one compact line "Chosen: <option> · sent to the agent"; the
  sidebar shows the plan under it until Core removes the card at the end
  of the agent's next turn.
- Errors in the card (`role="alert"`): Core's `card.error` (a refused
  choice or an unsent message), else the refusal of the last click, or the
  localized `core.bridge.unavailable`. No native dialogs.

Labels come from the localization dictionaries (`workflow.modeCard.*`;
option labels and descriptions by option id). Styles are in
`src/execution-mode-card.css` on the `--pm-*` tokens, sized for the narrow
sidebar (the plan panel's indent): each option row stacks its label with
the mark, the description and the reason above a full-width button; long
texts wrap (`overflow-wrap: anywhere`) and nothing scrolls horizontally.
The buttons reuse the cluster styles of `project-workflow-ui.css`.

## Tests

- `src/execution-mode-card.test.mjs` — bridge calls and the event filter,
  the facade props and the hook re-export, dismissed rendering, recommended
  row with mark, reason, filled button and hint, saving/chosen states, the
  narrow-sidebar layout, localized strings, the card no longer in the
  session window and no native dialogs.
- `session-sidebar/src/session-tree.test.mjs` renders the card under its
  owner in the sidebar tree (React `renderToStaticMarkup`).

## Owned Paths

- `module.md`
- `src/**`
