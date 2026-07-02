# Session Sidebar Module

## Responsibility

Own workspace switcher, selected-workspace session list, next-session mode entry, session rename, and Settings entry.

## Public Facade

`SessionSidebarFacade`

## Inputs

- Known workspace snapshot.
- Selected workspace session list.
- Core-owned next-session mode display summary.

## Outputs

- Workspace selection/create/open intents.
- Session open/create/rename intents.
- Next-session mode panel open intent.
- Settings navigation intent.
- Sidebar, workspace menu, session context menu, and Settings entry copy
  resolved through the shared browser localization provider.

- The `Next Session Mode` sidebar button is removed; session profile
  selection lives in the new-session wizard (session-window profile step).

## Owned Paths

- `module.md`
- `src/**`
