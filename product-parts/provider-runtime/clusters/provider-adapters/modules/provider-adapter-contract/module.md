# Provider Adapter Contract Module

## Responsibility

Define the shared provider adapter boundary used by Core. Adapters expose session-based operations; UI and Electron host never call provider CLIs, SDKs, or APIs directly.

## Public Facade

`ProviderAdapterContractFacade`

## Inputs

- Provider adapter descriptor.
- Provider session lifecycle requests.
- Provider turn dispatch request from Core.

## Outputs

- Provider session id, additively extended for session profiles:
  `createSession`/`resumeSession` return `string | ProviderSessionStartResult`
  (`{ providerSessionId, appliedProfileApplication? }`); Core normalizes via
  `normalizeProviderSessionStart`. Profile-aware adapters return the
  actually-applied provider-specific details for the immutable applied
  profile snapshot; legacy adapters keep returning plain strings.
- Optional `ProviderSessionStartOptions` on `createSession`/`resumeSession`
  carrying the provider-neutral `SessionProfilePayload` (prompt, tooling
  categories, profile identity, content hash, and optional native request
  `requestTemplate`/`tools` sidecars) materialized by Core; an absent payload
  keeps the adapter's current behavior
  (docs/architecture/SessionProfiles.md).
- Provider event subscription.
- Provider lifecycle errors.
- Core-owned `turnOptions` passed through to provider-owned migrated reference
  adapters.
- Provider-visible reasoning/thinking events emitted by provider-owned runtime
  modules rather than shared wrapper parsers.
- Usage-limit refresh boundary only; provider-specific usage-limit readers live
  inside their provider modules.
- Optional `rollbackSessionTurns(providerSessionId, numTurns)` boundary for
  provider-owned history pruning. The current implementation target is Codex
  app-server `thread/rollback`; providers without a verified rollback contract
  leave it unimplemented and Core rejects rollback for them.
- Optional `deleteSessionArtifacts(providerSessionId, workspacePath)` boundary so a
  removed session can clean up provider-owned per-session files; providers without
  such files leave it unimplemented.
- Optional `ensureWorkspaceHome(workspacePath)` boundary so Core can ask each
  provider to prepare workspace home/auth without starting the provider CLI/SDK;
  providers without workspace home work leave it unimplemented.
- Optional `captureNativeRequest(options: ProviderNativeCaptureOptions)`
  boundary for record-only diagnostic native request capture: the Core
  capture cluster owns the proxy and diagnostic certificates and passes
  `proxyUrl`, `certificateEnv`, `certificatePath`, selected `model`,
  `probePrompt`, `workspacePath` and optional `recordAppliedInputEnvelope`/
  `recordDiagnosticContext` callbacks; the adapter points its own client at
  the proxy and records the vendor-default request. The
  `ProviderNativeCaptureAppliedInputEnvelope` boundary types only `kind`
  (`claude`/`codex`); each adapter passes its own concrete envelope.
  Claude/Codex implement the method (the ACP Kimi implementation was removed
  end-to-end with its module, 2026-07-05 user order); other providers leave it
  unimplemented and Core treats a missing method as `provider_not_supported`.
- Turn stop reuses `closeSession(providerSessionId)`: closing the provider session
  interrupts the in-flight turn (Claude `interrupt`, Kimi `cancel`). Core then
  resumes the conversation through `resumeSession` on the next message, so no
  separate turn-interrupt method is part of the contract.

## Owned Paths

- `module.md`
- `src/**`
