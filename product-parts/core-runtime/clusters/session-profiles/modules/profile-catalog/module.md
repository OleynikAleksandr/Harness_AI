# Profile Catalog Module

## Responsibility

Own session profile selection truth: the catalog read model for UI surfaces,
the virtual Native profile (primary profile, always first, never on disk),
per-provider applicability (provider-scoped profiles apply only to their
passport `provider`; legacy universal profiles can be listed for management
but are not offered for new sessions), and the session-creation resolution
contract — "no selection => Native" as the guaranteed fallback, "selected but
broken/inapplicable => structured error, never a silent fallback".

The facade also owns the separate Profile Studio catalog. Its target is exact
`provider + model`; it contains only parsable Studio v2 profiles (both Draft
and Valid) and never contains virtual Native, Synthetic Native or legacy v1
profiles. Ordinary pickers hide every Studio Draft and expose a Studio Valid
entry only when the caller supplies the exact model id. Resolution repeats
the status/model checks so a stale UI selection cannot bypass Core truth.
Kimi Studio candidates remain visible in the Studio-only target list as Draft
work, but the ordinary picker and resolution centrally reject every Kimi
Studio entry even if its stored status was manually changed to `Valid`. This
gate remains until the universal client reaches all 25 captured Native tool
executors.

## Public Facade

`ProfileCatalogFacade`

## Inputs

- `ProfileStoreFacade` (constructor injection) for scanning, loading and
  first-access seeding (both listing entrypoints trigger seeding).
- Provider id of the session being created.
- Optional exact model id for Studio-aware ordinary picker/resolution calls.
- Exact provider/model target for Studio listing.
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
- `listStudioProfilesForTarget({ providerId, modelId })` — Studio-only exact
  target list with lifecycle status, creator-session binding and purpose; no
  Native or legacy rows.
- `listProfilesForProvider(providerId, modelId?)` preserves legacy behavior;
  the optional model admits only exact-model Studio `Valid` rows. Kimi Studio
  rows are never admitted to this ordinary picker before 25/25 executor
  parity.
- Grok is managed-profile eligible because its adapter now proves both the
  system prompt override and effective restricted tooling after session
  creation. Native remains the first/fallback entry; a Grok-scoped managed
  profile is offered only when its passport declares `provider: grok`.
- `resolveForSession({ profileId?, providerId, modelId? })` —
  `{ ok: true, kind: "native" }` for no/native selection;
  `{ ok: true, kind: "managed", profile }` for an applicable valid profile;
  `{ ok: false, error }` for broken, missing, legacy universal, or
  inapplicable selections, Studio Draft/wrong-model selections, and managed
  selections on unsupported providers. Kimi Studio selections are rejected
  with the explicit Draft-only 25/25 parity reason regardless of stored
  lifecycle status.

## Owned Paths

- `module.md`
- `src/**`
