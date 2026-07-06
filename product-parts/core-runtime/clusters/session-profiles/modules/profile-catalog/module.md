# Profile Catalog Module

## Responsibility

Own session profile selection truth: the catalog read model for UI surfaces,
the virtual Native profile (primary profile, always first, never on disk),
per-provider applicability (universal profiles apply to every
profile-supported provider; individual profiles only to their passport
`provider`; unsupported providers get Native only), and the session-creation
resolution contract — "no selection => Native" as the guaranteed fallback,
"selected but broken/inapplicable => structured error, never a silent
fallback".

## Public Facade

`ProfileCatalogFacade`

## Inputs

- `ProfileStoreFacade` (constructor injection) for scanning, loading and
  first-access seeding (both listing entrypoints trigger seeding).
- Provider id of the session being created.
- The user's profile selection (`profileId`, optional).

## Outputs

- `listAllProfiles()` — management read model (Profile Creator): Native
  first, then valid profiles (name, description, kind universal/individual,
  provider), then invalid directories with their human-readable issues.
- `listProfilesForProvider(providerId)` — picker read model: Native first
  plus applicable universal/individual entries; unsupported providers
  (outside `PROFILE_SUPPORTED_PROVIDER_IDS`: claude, codex) receive only
  Native. Universal-client providers remain Native-only until Phase 5 wires
  their synthetic-native wrapper/profile application layer; retired ids such
  as `kimi` and `glm-native` are not supported targets. The bundled
  `codex-synthetic-native` profile is an individual Codex entry when present in
  the profile store; selecting it resolves through the same managed payload
  path as other user-editable profiles.
- `resolveForSession({ profileId?, providerId })` —
  `{ ok: true, kind: "native" }` for no/native selection;
  `{ ok: true, kind: "managed", profile }` for an applicable valid profile;
  `{ ok: false, error }` for broken, missing, or inapplicable selections and
  for managed selections on unsupported providers.

## Owned Paths

- `module.md`
- `src/**`
