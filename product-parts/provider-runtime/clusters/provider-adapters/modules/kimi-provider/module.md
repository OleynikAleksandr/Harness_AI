# Kimi Provider Module

## Responsibility

Harness-packaged Kimi provider migrated from CodeAI-Hub.

Status after the Phase 2 visibility switch: this ACP provider is INTERNAL —
hidden from the provider picker, retained and registered for existing `kimi`
sessions only. New Kimi sessions start on the `kimi-client-provider`
universal-client endpoint. Full retirement of this module is a Phase 5 open
item ("kimi-provider afterlife").

The module owns the Harness facade and the embedded reference Kimi ACP
implementation. The facade only binds Harness workspace paths, provider home
state, selected model and thinking default; lifecycle, managed agent profile,
wire process/router, event normalization and Kimi-specific usage readers come from the
migrated CodeAI-Hub module.
Provider home storage is Harness-owned: workspace sessions use
`<workspace>/.harness/runtime/providers/kimi/home`, and non-workspace
fallbacks use `~/.harness-ai/providers/kimi/home`.
The facade accepts an explicit `providerHomePath` for Core-owned global-home
liveness preflight without treating that global home as a workspace root.

## Public Facade

`KimiProviderFacade`

## Inputs

- Provider turn request.
- Kimi auth/home configuration.
- Workspace path used as the CLI cwd so Kimi can read workspace-local instructions and project files.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- Kimi 5h and weekly usage limit telemetry read from the native Kimi usage API via the same user config used by the reference Kimi runtime.
- Kimi ACP assistant/thinking events routed by the reference session event
  router.
- Managed Kimi agent profile materialized under Harness runtime provider home.
- `ensureWorkspaceHome(workspacePath)` creates the workspace Kimi provider
  home and materializes the managed agent profile without starting Kimi CLI.
- `resumeSession` accepts the runtime `kimi:`-prefixed id that Core persists
  (createSession's return value) and strips the prefix before the ACP
  `session/resume`, which only knows the bare provider session id. This keeps
  resume-after-Stop working with the Core-stored id.

- Session profile binding verification (2026-07-02, task
  harness-ai.phase6.stream4.task1): the managed agent materialized into
  `<provider home>/codeai-managed-agent/` (`agent.yaml` +
  `system_prompt_path: ./system.md`) is NOT provably bound to the spawned
  CLI — `buildKimiCliEnvironment` launches plain `kimi acp` (no agent flag),
  the environment carries only `KIMI_MODEL_*`/`KIMI_CLI_NO_AUTO_UPDATE`, and
  the ACP session cwd is the workspace/provider home, not the agent
  directory. Because applying a profile that provably does not reach the
  model would be a silent substitution, managed session profiles for Kimi
  are DEFERRED: `profile-catalog` excludes `kimi` from
  `PROFILE_SUPPORTED_PROVIDER_IDS` (native-only in the picker), the adapter
  rejects managed start options defensively, and the follow-up stage must
  first verify a real binding channel (agent flag/env/config discovery in a
  newer CLI) before immutable content-hash-keyed per-profile artifacts land
  (docs/architecture/SessionProfiles.md).

- Session profile defensive guard (`kimi-profile-application.ts`):
  `createSession`/`resumeSession` accept the additive start options and
  reject `profileKind: "managed"` with a structured error (no silent
  substitution while the agent binding stays unverified); native/legacy
  keep today's materialized managed-agent behavior untouched.
- `kimi-provider-types.ts` holds the adapter option/event shapes, split out
  to keep `kimi-provider-adapter.ts` under the 500-line cap.
- Native request capture (`captureNativeRequest`) records the ORIGINAL Kimi
  CLI wrapping through the reverse-forward bridge, delegating to
  `diagnostics/kimi-native-request-capture-service.ts`. The kimi binary
  ignores proxy env, so the service clones the user's `~/.kimi-code`
  (`config.toml` + `credentials` + `device_id`) into a temp home, rewrites
  every `[providers.*]` `base_url` to the bridge URL (preserving the path, via
  the pure `kimi-capture-config-rewrite.ts` helper), and runs `kimi acp` with
  the DEFAULT agent (NOT the managed CodeAI agent) through
  `KimiWireProcessBridge`/`KimiWireRouter`: `initialize` -> `session/new` ->
  optional `session/set_config_option(model)` -> `session/prompt(probe)`. The
  kimi binary's first LLM request to the bridge carries the native system
  prompt + tool schemas; the bridge forwards it to `api.kimi.com` and records
  it. The temp home is removed after the run. The earlier wire-only capture
  was a stub (it recorded only a `wire.jsonl` path that nothing writes and
  completed a fake `captured`); the ACP wire leg carries no native prompt/
  tools — those live only in the LLM HTTPS request
  (`docs/architecture/SessionProfilesV2.md`, decision 5). NOTE (Phase R): the
  LIVE managed sessions still run the `codeai-managed-agent` (a Codex-derived
  system prompt), not the vendor base — flagged for the prompt research.

## Owned Paths

- `module.md`
- `src/**`
