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

## Outputs

- Workspace selection intents. The workspace menu ends with "New
  Project" (`onNewProject`), "Open Project" (`onOpenProject`, which replaces
  the former "Add Workspace") and "Project Doctor"
  (`onOpenProjectDoctor`); the session window opens the project workflow
  dialogs for them.
- Session open/create/rename/regenerate-title intents.
- Recursive parent/child rows with descendant/running counts, automatic
  ancestor expansion for the selected child, and independent open/detach
  controls on every level. Tree construction uses only Core session metadata;
  it never reads transcript text or provider rollouts.
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

## Owned Paths

- `module.md`
- `src/**`
