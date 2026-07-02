# Profile Settings UI Module

## Responsibility

Render the `Profile Creator` Settings tab for session profile management.

## Public Facade

`ProfileSettingsUiFacade`

## Inputs

- `PROFILE_SUPPORTED_PROVIDER_IDS` from the Core `profile-catalog` facade —
  the single source of truth for which providers can receive an individual
  profile (runtime constant import, same pattern as the Claude reasoning
  effort tables from `settings-normalization`).
- Provider display names from the `listProviders()` bridge RPC (Core/provider
  registry truth); ids fall back to themselves while names load.
- The profile catalog read model (`list-session-profiles`) arrives together
  with the profile list task of the active plan.

## Outputs

- The `Profile Creator` tab content, rendered by `provider-settings-ui`'s
  `SettingsTabContent` when the tab to the right of General is active: one
  static intro card describing what session profiles are and where profile
  documents live (`~/.harness-ai/Profiles`), followed by the New Profile
  card (`profile-create-flow.tsx`).
- New Profile flow: an in-app form (no native prompts, AGENTS.md §7) with a
  profile type choice (universal — no provider question / individual — a
  provider select limited to `PROFILE_SUPPORTED_PROVIDER_IDS`) and a name
  input; Create calls the `createSessionProfile` bridge RPC, then opens the
  three created documents in VS Code through `vscode://file/` links handled
  by the Electron host `vscode-link-opener` (prompt last, so it is the
  active editor tab). Core owns id derivation, duplicate detection and
  template contents; the form only disables Create on an empty name and
  shows Core's human-readable errors in the card status line.
- The profiles list (validity status, open-in-editor) lands as the next
  plan task; until then the tab intentionally shows no list controls.
- Copy resolves through the shared browser localization provider
  (`settings.profileCreator.*` message ids with English fallbacks).

## Owned Paths

- `module.md`
- `src/**`
