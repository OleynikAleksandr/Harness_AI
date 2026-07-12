# Codex Provider Module

## Responsibility

Harness-packaged Codex AppServer provider migrated from CodeAI-Hub.

The module owns the Harness facade and the embedded reference app-server
implementation. The facade only binds Harness workspace paths, provider home
state and settings path; provider workflow, app-server process management,
reasoning summary routing and provider-home config materialization come from
the migrated CodeAI-Hub module.
Provider home storage is Harness-owned: workspace sessions use
`<workspace>/.harness/runtime/providers/codex/home`, and non-workspace
fallbacks use `~/.harness-ai/providers/codex/home`.
The facade also accepts an explicit `providerHomePath` for Core-owned
global-home liveness preflight without pretending the global home is a
workspace root.
Dedicated diagnostic instances may also receive Core-resolved
`defaultReasoningEffort`; the facade passes it to the isolated app-server
workspace options instead of reading or deriving settings itself.
The workspace-scoped `CODEX_HOME`, `CODEX_WORKSPACE_PATH` and
`CODEX_SETTINGS_PATH` values are passed into the app-server process options, so
provider-home preparation uses the active workspace environment rather than
global process state.
Normal Harness sessions start Codex through the native/default app-server
profile so Codex keeps its own system instructions, native tooling, and
workspace `AGENTS.md` project-instruction discovery from `cwd`. When a Codex
managed/synthetic profile is selected, the adapter sends that frozen profile
prompt as `baseInstructions`; the app-server native tool layer still comes from
the shared process.

## Public Facade

`CodexProviderFacade`

## Inputs

- Provider turn request.
- Codex auth/home configuration.
- Active workspace path used as app-server `cwd`.
- Core-resolved default model and optional Codex reasoning effort. Codex effort
  values are `low`, `medium`, `high`, `xhigh`, `max`, and `ultra`; the provider
  `ultra` value is distinct from Claude `ultracode`.
- Per-turn provider-neutral `model` and `reasoningEffort` from Core settings.
  The adapter maps these directly to `turn/start.model` and
  `turn/start.effort` before consulting the legacy applied-config envelope or
  workspace/provider-home defaults. This keeps the visible per-model selection
  and the provider-facing live turn identical.

## Outputs

- Normalized provider events.
- Structured Codex collaboration notifications normalized without reading
  rollout text: current `subAgentActivity(kind=started)` items become
  `subagent_control`, while legacy `collabAgentToolCall` remains supported;
  child `thread/started` becomes `subagent_session` with metadata recovered
  from `source.subAgent.thread_spawn`, and child turn/thread lifecycle becomes
  `subagent_status`. The app-server facade creates the child subscription state
  under the same workspace before Core adopts the provider thread. The
  structured agent-path title is also the delegated-task label; inherited
  `thread.preview` text is only a fallback when the path is unavailable.
- Structured subagent history hydration through app-server RPC only:
  `thread/list(ancestorThreadId)` discovers recursive descendants and
  `thread/read(includeTurns=true)` replays persisted collaboration,
  child-owned `agentMessage` and `reasoning` items through the same event router
  used for live notifications. Because a forked child read also contains
  ancestor turns, the loader reads the ancestor chain and excludes every turn
  id owned by an ancestor before replaying the child transcript. Collaboration
  replay remains independently ownership-filtered: current
  `subAgentActivity` must target a direct child of the current structured
  agent path, while legacy calls use `senderThreadId`. No provider rollout file
  parsing is used. Historical `notLoaded` is treated as pending until the
  loader replays the latest child-owned turn status; completed, failed,
  interrupted and in-progress turns therefore retain their app-server
  semantics after restart. Hydrations of different roots run through one
  serial chain (shared replay sets, deterministic notification order), each
  descendant `thread/started` is paired immediately with its replay, and a
  descendant whose terminal status was already replayed is never re-announced
  — a late `thread/started` used to downgrade the restored terminal status
  under concurrent parent+child hydration.
- Provider usage/context telemetry.
- Model capability lookup for the live picker family: GPT-5.6 Sol/Terra
  support through `ultra`, GPT-5.6 Luna through `max`, and
  GPT-5.5/5.4/5.4 Mini/5.3 Codex Spark through `xhigh`; GPT-5.2 is retired.
- Codex app-server `thread/tokenUsage/updated` events preserve the
  provider-reported cached input token count when present, so Core telemetry can
  display cache reuse beside context-window usage.
- Codex usage-limit telemetry built inside the Codex provider module from
  app-server rate-limit snapshots/events.
- Turn-level Codex reasoning summaries emitted by the reference app-server
  event router. Completed reasoning items may arrive either as legacy string
  arrays or as app-server schema objects such as
  `{ type: "summary_text", text }`; the router normalizes both shapes before
  emitting Harness `thinking` messages.
- Provider-home `config.toml` materialized by the reference provider-home
  process code under Harness runtime paths with top-level
  `model_reasoning_summary = "detailed"` so the process-global config does not
  suppress the per-turn detailed summary request.
- Native Codex `thread/start` without workflow `baseInstructions` or
  `project_doc_max_bytes: 0` override for ordinary workspace sessions; selected
  managed/synthetic profiles pass their prompt payload as `baseInstructions`.
  Live sessions use `persistExtendedHistory: false`, matching Native Request
  Capture, so the stable native prompt prefix can be reused by provider prompt
  cache from the second turn instead of depending on extended-history bootstrap
  state. This is an accepted packaged-app compatibility finding from
  2026-07-08: changing it back to `true` requires re-running the Codex
  app-server cache-anchor probe and proving second-turn cache stability.
- `deleteSessionArtifacts(providerSessionId, workspacePath)` removes the Codex
  rollout log(s) for a removed session from the workspace provider home, leaving
  the shared provider home otherwise intact.
- `ensureWorkspaceHome(workspacePath)` materializes workspace Codex auth/config
  through the provider home manager without starting the Codex app-server.
- `rollbackSessionTurns(providerSessionId, numTurns)` is a Codex-only
  app-server capability. It validates a positive turn count, calls
  `thread/rollback`, then reads `thread/read includeTurns=true` and returns the
  remaining provider-visible turn count for Core telemetry refresh.

- Session profile application layer (`codex-profile-application.ts`):
  managed and synthetic-native sessions send the frozen snapshot prompt as
  `baseInstructions` on `thread/start`/`thread/resume` (full replacement of the
  built-in instructions); raw Native omits it so the vendor CLI runs untouched;
  legacy sessions pass no options at all. Tooling categories are an MVP no-op:
  tool availability is fixed by the shared app-server process `--disable`
  flags, and restarting that shared process per profile would invalidate
  other sessions' thread bindings — the effective process profile key is
  recorded in the applied details (`ProviderSessionStartResult`) as
  groundwork for a future per-profile process pool.

- Native request capture (`codex-native-request-capture-service.ts`,
  reached through the adapter's `captureNativeRequest`): a record-only
  diagnostic path that starts an isolated temporary Codex app-server (the
  long-lived app-server env is never mutated) and captures the vendor-default
  request — no Harness workflow `baseInstructions`/`config` injection — so the
  captured request is Codex's native instructions and tool set. The temporary
  app-server runs the default process profile. Codex 0.142.x forces the
  WebSocket responses transport and it cannot be disabled
  (`--disable responses_websockets` no longer switches it; the earlier
  `codex:native-capture` profile was removed), so the forward-transit capture
  proxy completes the WebSocket upgrade with the vendor and decodes the request
  from the `response.create` frame (`docs/architecture/SessionProfilesV2.md`,
  decision 5). It injects the diagnostic proxy env (`HTTPS_PROXY`/`ALL_PROXY` +
  `NODE_EXTRA_CA_CERTS`/`SSL_CERT_FILE`/`REQUESTS_CA_BUNDLE`), records the
  applied-input-envelope and app-server diagnostic context, and stops the
  temporary process afterward. The managed-vs-vanilla comparison and the
  translation-capture scenario were removed (with the now-dead
  `codex-workflow-instruction-profile.ts` and
  `codex-native-translation-capture-profile.ts`); only recording remains. The
  Core-selected capture reasoning takes precedence over the adapter default
  in `turn/start.effort`; diagnostics record the exact request, including
  `ultra`, before Codex may normalize its downstream `response.create` body to
  `max`.

## Owned Paths

- `module.md`
- `src/**`
