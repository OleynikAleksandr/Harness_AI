# Session Sidebar Module

## Responsibility

Own workspace switcher, selected-workspace recursive session tree, session
rename UI, and Settings entry.

## Public Facade

`SessionSidebarFacade`

## Inputs

- Known workspace snapshot.
- Selected workspace session list.
- Core-owned `sessionKind`, `parentSessionId`, delegated task, subagent
  status/nickname/role and title metadata.

## Outputs

- Workspace selection/create/open intents.
- Session open/create/rename/regenerate-title intents.
- Recursive parent/child rows with descendant/running counts, automatic
  ancestor expansion for the selected child, and independent open/detach
  controls on every level. Tree construction uses only Core session metadata;
  it never reads transcript text or provider rollouts.
- A child row uses its delegated task plus localized status as the secondary
  line, falling back to role plus status when no task is available. It does not
  repeat `agentNickname` when Core already used that nickname as the title.
- An in-app React rename dialog (100-character UI limit matching Core) and
  context-menu regenerate action. Native browser/Electron prompt and confirm
  dialogs are not used. The controls render only when the parent session window
  supplies working Core command callbacks.
- Settings navigation intent.
- Sidebar, workspace menu, session context menu, and Settings entry copy
  resolved through the shared browser localization provider.

- The `Next Session Mode` sidebar button is removed; session profile selection
  lives in the new-session wizard (session-window profile step).

## Owned Paths

- `module.md`
- `src/**`
