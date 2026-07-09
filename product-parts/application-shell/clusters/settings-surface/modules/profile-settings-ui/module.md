# Profile Settings UI Module

## Responsibility

Render the `Profile Creator` Settings tab for session profile management.

## Public Facade

`ProfileSettingsUiFacade`

## Inputs

- `PROFILE_SUPPORTED_PROVIDER_IDS` from the Core `profile-catalog` facade —
  the single source of truth for which active providers can receive a
  provider-scoped profile (runtime constant import, same pattern as the Claude
  reasoning effort tables from `settings-normalization`).
- Provider display names from the `listProviders()` bridge RPC (Core/provider
  registry truth); ids fall back to themselves while names load.
- The profile catalog read model from the `listSessionProfiles()` bridge RPC
  (passports, legacy universal/provider kind, validity status with
  human-readable issues); listing triggers first-access seeding in Core.

## Outputs

- The `Profile Creator` tab content, rendered by `provider-settings-ui`'s
  `SettingsTabContent` when the tab to the right of General is active: one
  static intro card describing what session profiles are and where profile
  documents live (`~/.harness-ai/Profiles`), followed by the New Profile
  card (`profile-create-flow.tsx`).
- New Profile flow: an in-app form (no native prompts, AGENTS.md §7) with a
  provider select limited to `PROFILE_SUPPORTED_PROVIDER_IDS` and a name input;
  Create calls the `createSessionProfile` bridge RPC with both values, then
  opens the three created documents in VS Code through `vscode://file/` links
  handled by the Electron host `vscode-link-opener` (prompt last, so it is the
  active editor tab). Core owns id derivation, duplicate detection, provider
  validation and template contents; the form only disables Create on an empty
  name and shows Core's human-readable errors in the card status line. The form
  no longer creates universal profiles.
- Profiles list (`profile-list.tsx`): every stored profile with its kind
  (Legacy Universal/Provider profile), applicability (legacy read-only status /
  the provider's display name) and per-profile validity status — a
  Valid/Invalid chip plus Core's human-readable issue texts under the row.
  Provider profiles and invalid directories stay openable through "Edit in VS
  Code" because that is how they get fixed. Valid legacy universal profiles are
  shown as read-only and not opened by the UI. The virtual Native profile is
  filtered out (it has no files), and rename/delete stays files-first in the
  MVP (no list controls for it). Creating a profile bumps the facade's refresh
  key, remounting the list so it reloads from Core.
- Live refresh: the list subscribes to Core events through
  `window.harnessCore.onEvent` and re-runs the catalog RPC when a
  `session-profiles:updated` event arrives (Core's profile file watcher), so
  saving a profile file in VS Code updates the visible name/description and
  validity without an app restart. The event only triggers a reload; the
  catalog data itself always comes from Core.
- Copy resolves through the shared browser localization provider
  (`settings.profileCreator.*` message ids with English fallbacks).

## Owned Paths

- `module.md`
- `src/**`
