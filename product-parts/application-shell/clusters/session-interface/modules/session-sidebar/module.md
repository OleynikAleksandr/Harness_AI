# Session Sidebar Module

## Responsibility

Own workspace switcher, selected-workspace recursive session tree, session
rename UI, Settings entry and the one-click Profile Studio mode entry beside
Settings.

## Public Facade

`SessionSidebarFacade`

## Inputs

- Known workspace snapshot.
- Selected workspace session list.
- Core-owned `sessionKind`, `parentSessionId`, delegated task, subagent
  status/nickname/role and title metadata.
- The Core plan view of the selected workspace: the sidebar facade calls
  `useProjectPlanView(workspace.id)` (module `project-plan-panel`), kept
  current by `workflow:status` events, and passes it to `SessionTree` as
  `planView`.
- The Core execution mode card of the selected workspace: the sidebar
  facade calls `useExecutionModeCard(workspace.id)` (module
  `execution-mode-card`), kept current by `workflow:mode-choice` events,
  and passes `{card, choose}` to `SessionTree` as `modeChoice`.

## Outputs

- Workspace selection intents. The workspace menu ends with "New
  Project" (`onNewProject`), "Open Project" (`onOpenProject`, which replaces
  the former "Add Workspace") and "Project Doctor"
  (`onOpenProjectDoctor`); the session window opens the project workflow
  dialogs for them. The menu is `workspace-menu.tsx` (`WorkspaceMenu`):
  right-click on a project opens an in-app context menu whose first item,
  "Remove from Harness AI" (`sidebar.removeProject`), sends
  `onRemoveWorkspace(workspaceId)`; a failure text from Core stays in the
  menu. The built-in workspace (`builtInWorkspaceId` from Core) gets no
  context menu. Escape or a pointer outside closes it.
- Session open/create/rename/regenerate-title intents.
- Recursive parent/child rows with descendant/running counts, automatic
  ancestor expansion for the selected child, and independent open/detach
  controls on every level. Tree construction uses only Core session metadata;
  it never reads transcript text or provider rollouts.
- The plan (spec 10.2 of `WorkflowKitExecutionModes.md`): when
  `planView.ownerSessionId` is a listed session, `ProjectPlanPanelFacade`
  renders right under that session's card (before its child cards) with the
  tree's `onSelectSession` as the open path, so an executor row opens its
  session like a row click. The owner card's secondary line starts with its
  role from the Core plan mode — "Orchestrator" (`sidebar.role.orchestrator`)
  in orchestrated mode, "Agent" (`sidebar.role.agent`) otherwise — followed
  by the subagent summary. Sessions in `planView.boundSessionIds` get no card
  anywhere in the tree (and are not counted in the summary); their own
  children are not shown either. Other subagents stay child cards as before.
  Without a plan view, or with an owner outside the list, the tree is
  unchanged. The tree only reads these Core fields; it never compares
  working directories or worktrees.
- The execution mode card (`docs/architecture/ReleaseFixes-2026-11-04-2.md`,
  section 3): when `modeChoice.card.sessionId` is a listed session and the
  card is not `dismissed`, `ExecutionModeCardFacade` renders right under
  that session's card, in the plan slot, with `modeChoice.choose` as the
  click route. While the card is `offered` or `saving` the plan panel of
  that owner is not shown; once `chosen`, the compact chosen line stays
  above the plan panel until Core removes the card. An owner outside the
  list shows no card.
- A child row uses its delegated task plus localized status as the secondary
  line, falling back to role plus status when no task is available. It does not
  repeat `agentNickname` when Core already used that nickname as the title.
- A child row's leading status indicator encodes progress by shape: pending
  and running children render a neutral hollow ring, while settled outcomes
  keep a filled dot — green `completed`, orange `interrupted`, red
  `failed`/`not_found`, grey `shutdown`. Inline timeline cards and the child
  header keep filled dots and share the same settled colors.
- An in-app React rename dialog (100-character UI limit matching Core) and
  context-menu regenerate action. Native browser/Electron prompt and confirm
  dialogs are not used. The controls render only when the parent session window
  supplies working Core command callbacks.
- The context menu opens from a right-click anywhere on a primary session row:
  the title button stretches over the free row width (`flex: 1` +
  `align-self: stretch` in the shared session-window stylesheet) and the
  chevron/detach buttons share the same contextmenu handler. Title-button-only
  handling left dead zones — row padding, tree chevron, detach icon — where
  the gesture silently did nothing or merely dismissed an open menu
  (acceptance finding 2026-07-13). Subagent rows intentionally have no
  context menu.
- The menu renders `position: fixed`, anchored to the viewport rect of the
  row captured at open time, and closes on scroll/resize. With absolute
  positioning the scrollable `.session-list` clipped the menu entirely
  whenever the list content was shorter than the menu (one session in the
  workspace → menu fully below the list's bottom edge), which read as
  "delete works every other time" (second acceptance finding 2026-07-13,
  verified live via DevTools in the packaged app).
- Settings navigation intent.
- Profile Studio navigation intent. The entry exists only in the ordinary
  sidebar; detached session windows do not render this facade.
- Sidebar, workspace menu, session context menu, and Settings entry copy
  resolved through the shared browser localization provider.

- The `Next Session Mode` sidebar button is removed; session profile selection
  lives in the new-session wizard (session-window profile step).

## Tests

- `src/session-tree.test.mjs` — tree construction, row context menu and
  styles (source checks), and a server render (React
  `renderToStaticMarkup`) of the plan under the owner card: the
  Orchestrator/Agent role, the bound executor without a card and not
  counted, the other subagent kept, and the unchanged tree without a plan
  or with an unlisted owner; the mode card under its owner (offered rows,
  recommended mark, reason and hint without the plan, saving with disabled
  buttons, Core error, chosen line above the plan, dismissed, another or
  an unlisted owner).
- `src/workspace-menu.test.mjs` — the workspace menu and its project
  context menu.

## Owned Paths

- `module.md`
- `src/**`
