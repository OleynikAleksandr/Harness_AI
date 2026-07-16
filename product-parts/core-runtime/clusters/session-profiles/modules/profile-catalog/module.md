# Profile Catalog Module

## Responsibility

Own session profile selection truth: the catalog read model for UI surfaces,
the virtual Native profile (primary profile, always first, never on disk),
per-provider applicability (provider-scoped profiles apply only to their
passport `provider`; legacy universal profiles can be listed for management
but are not offered for new sessions), and the session-creation resolution
contract — "no selection => Native" as the guaranteed fallback, "selected but
broken/inapplicable => structured error, never a silent fallback".

## Public Facade

`ProfileCatalogFacade`

## Inputs

- `ProfileStoreFacade` (constructor injection) for scanning, loading and
  first-access seeding (both listing entrypoints trigger seeding).
- Provider id of the session being created.
- The user's profile selection (`profileId`, optional).

## Outputs

- `listAllProfiles()` — management read model (Profile Creator): Native
  first, then valid profiles (name, description, kind legacy
  universal/individual, provider), then invalid directories with their
  human-readable issues.
- `listProfilesForProvider(providerId)` — picker read model: Native first
  plus entries whose passport `provider` exactly matches the requested
  provider. `PROFILE_SUPPORTED_PROVIDER_IDS` tracks all active Core provider
  ids: `claude`, `codex`, `grok`, `kimi-client`, `glm-client`,
  `openrouter-client`, and `local-models-client`. Retired ids such as `kimi`
  and `glm-native` are not supported targets.
- Grok is managed-profile eligible because its adapter now proves both the
  system prompt override and effective restricted tooling after session
  creation. Native remains the first/fallback entry; a Grok-scoped managed
  profile is offered only when its passport declares `provider: grok`.
- `resolveForSession({ profileId?, providerId })` —
  `{ ok: true, kind: "native" }` for no/native selection;
  `{ ok: true, kind: "managed", profile }` for an applicable valid profile;
  `{ ok: false, error }` for broken, missing, legacy universal, or
  inapplicable selections and for managed selections on unsupported providers.

## Owned Paths

- `module.md`
- `src/**`
