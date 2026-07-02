# Profile Settings UI Module

## Responsibility

Render the `Profile Creator` Settings tab for session profile management.

## Public Facade

`ProfileSettingsUiFacade`

## Inputs

- None yet. The profile catalog read model (`list-session-profiles`) arrives
  together with the profile list task of the active plan.

## Outputs

- The `Profile Creator` tab content, rendered by `provider-settings-ui`'s
  `SettingsTabContent` when the tab to the right of General is active.
- Current skeleton state: one static intro card describing what session
  profiles are and where profile documents live (`~/.harness-ai/Profiles`).
  No interactive controls are shown yet — the New Profile flow and the
  profiles list land as the next plan tasks, so no dead controls appear in
  the meantime.
- Copy resolves through the shared browser localization provider
  (`settings.profileCreator.*` message ids with English fallbacks).

## Owned Paths

- `module.md`
- `src/**`
