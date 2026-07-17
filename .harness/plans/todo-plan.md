# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-native-request-capture-2026-07-16",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase8.stream1.task3",
  "expectedCommitMessage": "feat: read Kimi native token usage",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request 2026-07-16 — add Kimi and its three
  current Coding Plan models (`kimi-for-coding`,
  `kimi-for-coding-highspeed`, `k3`) to Settings -> General -> Native
  Request Capture so the diagnostic path records the original Kimi CLI
  system instructions and native tool schemas, not Harness universal-client
  prompt/tool material.
- **Planning source (stream 2):** user request 2026-07-17 — add two
  Settings -> Kimi sections mirroring the Codex tab: a Kimi Versions card
  (CLI row only; Kimi has no SDK package, the CLI is a standalone binary
  with a native `kimi upgrade` channel) and a Kimi Session Continuity card
  (stored threshold setting; no provider consumes the threshold yet, the
  runtime consumer stays out of this scope).
- **Planning source (stream 3):** user request 2026-07-17 — profile-selective
  Kimi session routing: the built-in `native` profile runs sessions through
  the installed Kimi CLI over ACP (default agent, real `~/.kimi-code` home,
  no base-URL rewrite), every other profile keeps the universal client and
  the universal-client path starts really applying the materialized managed
  profile (system prompt + tooling categories). The Kimi ACP surface cannot
  verifiably change prompt/tooling (model selection only), so native-ACP
  serves the native profile exclusively; the provider id stays
  `kimi-client` and the retired standalone ACP provider id `kimi` does not
  return. This user order supersedes the earlier "the removed ACP session
  provider does not return" doc rule, which must be rewritten to the
  selective model.
- **Planning source (stream 4):** user defect feedback 2026-07-17 on the
  packaged profile-routing build (workspace `/Users/oleksandroliinyk/VSCODE/Test_md/`):
  native Kimi sessions show no thinking bubbles, no subagent activity (must
  match Claude/Codex), an empty lower status panel (context window, cache,
  turns) and empty top usage limits. Live diagnosis: Kimi CLI `0.26.0` sends
  subagents only as `Agent`/`AgentSwarm` tool_call updates (result carries
  `agent_id`/`actual_subagent_type`/`status`), sends NO `usage_update`
  notifications (usage lives in the session store `wire.jsonl`
  `usage.record` rows incl. `inputCacheRead`), the limits endpoint
  `GET /coding/v1/usages` works with the config-TOML key, and
  `session/set_config_option {thinking, "on"}` is rejected by the CLI
  (`Internal error`) even though `session/new` advertises the option —
  thinking stays a best-effort request with an honest diagnostic. The user
  pre-authorized packaging the fixed build in the same order.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `docs/architecture/NativePromptComposition.md`
  - `docs/architecture/CodeAIHubProviderRuntimeAlignment.md`
  - `product-parts/core-runtime/clusters/provider-network-capture/cluster.md`
  - `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/cluster.md`
  - `product-parts/provider-runtime/clusters/provider-registry/modules/provider-descriptor/module.md`
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`
  - `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/module.md`
  - `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan
  splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- Kimi session routing is profile-selective since stream 3 (2026-07-17 user
  order): the built-in `native` profile runs through the installed Kimi CLI
  over ACP inside the `kimi-client` adapter, every managed profile runs
  through the universal client. The standalone ACP provider id `kimi` stays
  retired; the capture path stays diagnostic-only.
- The capture path must launch the installed Kimi CLI with its default native
  agent wrapping and the selected model, using a temporary cloned provider
  home and the verified reverse-forward bridge algorithm from repository
  history.
- Core/provider-runtime own provider, model, capture routing and artifact
  truth. The renderer only displays the catalog and submits the command.
- Any source change updates every related Markdown document in the same
  commit. Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files
  are added, moved or deleted.
- Scope closeout/archival is user-directed only.
- Do not start `npm run package:mac` without a separate explicit user
  confirmation. User acceptance remains separate and does not close scope.
- Quality gates run automatically on every commit; do not add a separate gate
  task.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-07-16)

### Stream: Plan Fixation

1. [DONE] `harness-ai.phase1.stream1.task1` Bootstrap the Kimi native-request-capture scope and record the diagnostic-only architecture boundary (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: bootstrap Kimi native capture scope`). Result: Completed in commit `plan: bootstrap Kimi native capture scope`.
2. [DONE] Git Commit: `plan: bootstrap Kimi native capture scope` (hash: self)

## Phase 2 - Kimi Native Capture Runtime (owner: Codex, updated: 2026-07-16)

### Stream: Reverse Transit And CLI Driver

3. [DONE] `harness-ai.phase2.stream1.task1` Restore the provider-neutral Kimi reverse-forward transit and Kimi artifact type while preserving Claude/Codex paths; cover target matching, forwarding and reasoning-qualified artifact naming and synchronize capture-cluster docs (scope: `capture-proxy/src/capture-proxy-reverse.ts, capture-orchestrator/src/capture-orchestrator-facade.ts, capture-artifacts/src/capture-artifacts-facade.ts` + paired tests/docs; expected commit: `feat: restore Kimi native capture transport`). Result: Completed in commit `feat: restore Kimi native capture transport`.
4. [DONE] Git Commit: `feat: restore Kimi native capture transport` (hash: self)
5. [DONE] `harness-ai.phase2.stream1.task2` Add a diagnostic-only Kimi CLI capture module that clones the real Kimi auth/config into a temporary home, rewrites only provider base URLs to the reverse bridge, selects the requested model and drives one native default-agent probe; cover config rewriting, process cleanup and applied-envelope evidence and synchronize provider-adapter/product-tree docs (scope: `provider-adapters/modules/kimi-native-capture/src/kimi-native-capture-facade.ts, provider-adapters/modules/kimi-native-capture/src/kimi-capture-config-rewrite.ts, provider-adapters/modules/kimi-native-capture/src/kimi-acp-client.ts` + paired tests/docs/product-tree; expected commit: `feat: add Kimi CLI native capture driver`). Result: Completed in commit `feat: add Kimi CLI native capture driver`.
6. [DONE] Git Commit: `feat: add Kimi CLI native capture driver` (hash: self)

## Phase 3 - Core Contract And Settings Surface (owner: Codex, updated: 2026-07-16)

### Stream: Catalog Routing And Readable Artifacts

7. [DONE] `harness-ai.phase3.stream1.task1` Register Kimi plus the three Core-owned Coding Plan models in the native-capture catalog, model optional provider-default reasoning honestly, and route Kimi capture commands to the diagnostic CLI facade without re-registering the retired ACP provider; cover RPC validation and synchronize registry/runtime docs (scope: `provider-descriptor/src/provider-descriptor-facade.ts, core-runtime-process/src/core-native-capture-rpc.ts, provider-adapter-contract/src/provider-adapter-contract-facade.ts` + paired tests/docs; expected commit: `feat: register Kimi native capture catalog`). Result: Completed in commit `feat: register Kimi native capture catalog`.
8. [DONE] Git Commit: `feat: register Kimi native capture catalog` (hash: self)
9. [DONE] `harness-ai.phase3.stream1.task2` Update the Native Request Capture card to display Kimi cleanly, allow models with provider-default reasoning, and verify the readable artifact parser extracts Kimi system messages and native tool schemas from the current CLI request envelope; synchronize UI/artifact docs (scope: `provider-settings-ui/src/native-capture-card.tsx, capture-artifacts/src/capture-payload-sections.ts, capture-artifacts/src/capture-markdown-format.ts` + paired tests/docs; expected commit: `feat: expose Kimi native capture in Settings`). Result: Completed in commit `feat: expose Kimi native capture in Settings`.
10. [DONE] Git Commit: `feat: expose Kimi native capture in Settings` (hash: self)

## Phase 4 - Live Verification (owner: Codex, updated: 2026-07-16)

### Stream: Native CLI Evidence

11. [DONE] `harness-ai.phase4.stream1.task1` Run focused live native captures with installed Kimi CLI `0.26.0` for all three model ids, verify raw JSONL against the derived Markdown system/tool sections, and record sanitized evidence without credentials or full sensitive prompts (scope: `docs/evidence/kimi-native-request-capture-2026-07-16.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: verify Kimi native request capture`). Result: Completed in commit `chore: verify Kimi native request capture`.
12. [DONE] Git Commit: `chore: verify Kimi native request capture` (hash: self)

## Phase 5 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-16)

### Stream: Package And Retest

13. [DONE] `harness-ai.phase5.stream1.task1` After explicit user confirmation, package the app for user verification (`npm run package:mac`) and record package evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: package Kimi native capture build`). Result: Completed in commit `chore: package Kimi native capture build`.
14. [DONE] Git Commit: `chore: package Kimi native capture build` (hash: self)
15. [DONE] `harness-ai.phase5.stream1.task2` User captures all three Kimi models from Settings -> General and confirms the raw/readable artifacts contain the expected native CLI system prompt and tool schemas (completion: user-acceptance; scope: user workflow; expected commit: none). Result: User acceptance recorded — User accepted current Kimi native capture implementation (Settings capture, all three models) Acceptance Commit: `chore: record plan acceptance kimi-native-request-capture-2026-07-16`.

## Phase 6 - Kimi Settings Parity (owner: Codex, updated: 2026-07-17)

### Stream: Kimi Versions And Continuity Cards

16. [DONE] `harness-ai.phase6.stream1.task1` Extend the active scope with the Kimi settings parity stream: Settings -> Kimi gains a Kimi Versions card (single CLI row driven by the native `kimi upgrade` channel; Kimi has no SDK) and a Kimi Session Continuity card (stored threshold only; the runtime consumer stays out of scope for every provider) (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: add Kimi settings parity stream`). Result: Completed in commit `plan: add Kimi settings parity stream`.
17. [DONE] Git Commit: `plan: add Kimi settings parity stream` (hash: self)
18. [DONE] `harness-ai.phase6.stream1.task2` Add `autoUpdate` and `sessionContinuity` settings to the Kimi client provider namespace with Codex-equivalent defaults (auto-update off, threshold 30) and the same system/workspace projection split; cover defaults and projection routing with tests and synchronize settings-store docs (scope: `settings-store/src/settings-store-facade.ts, settings-store/src/settings-store-projections.ts` + paired tests/docs; expected commit: `feat: add Kimi common provider settings`). Result: Completed in commit `feat: add Kimi common provider settings`.
19. [DONE] Git Commit: `feat: add Kimi common provider settings` (hash: self)
20. [DONE] `harness-ai.phase6.stream1.task3` Serve Kimi CLI version status through the provider-versions RPC: current version from the installed CLI, latest from the CLI's own update-channel state, update via native `kimi upgrade`, no SDK entry; export the CLI version tooling from the Kimi native-capture facade and extend renderer RPC typings; cover version/update flows with tests and synchronize runtime/adapter docs (scope: `core-runtime-process/src/core-provider-tools.ts, kimi-native-capture/src/kimi-native-capture-facade.ts, session-window/src/vite-env.d.ts` + paired tests/docs; expected commit: `feat: serve Kimi CLI version status`). Result: Completed in commit `feat: serve Kimi CLI version status`.
21. [DONE] Git Commit: `feat: serve Kimi CLI version status` (hash: self)
22. [DONE] `harness-ai.phase6.stream1.task4` Render the Kimi Versions card in Settings -> Kimi with a single CLI row (no SDK row), the shared warning banner and the auto-update toggle wired to the new Kimi settings key, reusing the shared versions card component; cover CLI-only rendering with tests and synchronize provider-settings-ui/localization docs (scope — this task is explicitly split as 4 functional files because the shared update handler's provider type widens with the card: `provider-settings-ui/src/provider-version-controls.tsx, provider-settings-ui/src/settings-tab-content.tsx, provider-settings-ui/src/settings-surface-facade.tsx, localization-runtime/src/source-dictionaries.ts` + paired tests/docs; expected commit: `feat: show Kimi versions card in Settings`). Result: Completed in commit `feat: show Kimi versions card in Settings`.
23. [DONE] Git Commit: `feat: show Kimi versions card in Settings` (hash: self)
24. [DONE] `harness-ai.phase6.stream1.task5` Render the Kimi Session Continuity card in Settings -> Kimi bound to the stored threshold with a localized title, reusing the shared continuity card component; cover the card wiring with tests and synchronize provider-settings-ui/localization docs (scope: `provider-settings-ui/src/settings-tab-content.tsx, localization-runtime/src/source-dictionaries.ts` + paired tests/docs; expected commit: `feat: show Kimi session continuity card`). Result: Completed in commit `feat: show Kimi session continuity card`.
25. [DONE] Git Commit: `feat: show Kimi session continuity card` (hash: self)
26. [DONE] `harness-ai.phase6.stream1.task6` After explicit user confirmation, package the app for user verification (`npm run package:mac`) and record package evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: package Kimi settings cards build`). Result: Completed in commit `chore: package Kimi settings cards build`.
27. [DONE] Git Commit: `chore: package Kimi settings cards build` (hash: self)
28. [DONE] `harness-ai.phase6.stream1.task7` User verifies Settings -> Kimi shows the Kimi Versions card (single CLI row with real current/latest/update behavior) and the Kimi Session Continuity threshold that persists across restarts (completion: user-acceptance; scope: user workflow; expected commit: none). Result: User acceptance recorded — User accepted Kimi settings parity cards (Versions CLI row + Session Continuity) in packaged app Acceptance Commit: `chore: record plan acceptance kimi-native-request-capture-2026-07-16`.

## Phase 7 - Kimi Profile-Selective Routing (owner: Codex, updated: 2026-07-17)

### Stream: Native ACP Path And Managed Client Path

29. [DONE] `harness-ai.phase7.stream1.task1` Extend the active scope with the Kimi profile routing stream: native profile -> installed Kimi CLI over ACP with the default agent, any managed profile -> universal client with the materialized profile really applied; record that the provider id stays `kimi-client` and the doc rule "the removed ACP session provider does not return" is superseded by this user order (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: add Kimi profile routing stream`). Result: Completed in commit `plan: add Kimi profile routing stream`.
30. [DONE] Git Commit: `plan: add Kimi profile routing stream` (hash: self)
31. [DONE] `harness-ai.phase7.stream1.task2` Add the `kimi-native-session` module transport layer: supervised `kimi acp` child process against the real `~/.kimi-code` home (no config rewrite, auto-update disabled for session stability), newline JSON-RPC router with request correlation/timeouts/reverse-request dispatch, and wire contracts, following the verified Grok ACP layering; cover process lifecycle and router correlation with tests and register the module in product-tree docs (scope — this task is explicitly split as 4 functional files because the module facade must exist from the first commit (facade rule + knip entry): `kimi-native-session/src/kimi-acp-session-process.ts, kimi-native-session/src/kimi-acp-session-router.ts, kimi-native-session/src/kimi-acp-session-contracts.ts, kimi-native-session/src/kimi-native-session-facade.ts` + paired tests/docs/product-tree; expected commit: `feat: add Kimi ACP session transport`). Result: Completed in commit `feat: add Kimi ACP session transport`.
32. [DONE] Git Commit: `feat: add Kimi ACP session transport` (hash: self)
33. [DONE] `harness-ai.phase7.stream1.task3` Add the Kimi native session runtime and event normalizer: initialize -> session/new -> model select (`session/set_config_option`) -> multi-turn `session/prompt` with `session/cancel` stop semantics, and normalize `session/update` notifications (assistant/thought/tool/plan/usage) into Core NormalizedProviderEvents without renderer heuristics; cover turn lifecycle and normalization with tests (scope: `kimi-native-session/src/kimi-native-session-runtime.ts, kimi-native-session/src/kimi-session-event-normalizer.ts` + paired tests/docs; expected commit: `feat: add Kimi native session runtime`). Result: Completed in commit `feat: add Kimi native session runtime`.
34. [DONE] Git Commit: `feat: add Kimi native session runtime` (hash: self)
35. [DONE] `harness-ai.phase7.stream1.task4` Add the Kimi interaction bridge and the module facade: allowlisted ACP permission/reverse requests map to sanitized Core provider interactions with fail-closed decisions, and the facade exposes the session driver surface (create/resume/send/subscribe/stop/delete/respond) the provider adapter will consume; cover bridge mapping and facade lifecycle with tests (scope: `kimi-native-session/src/kimi-interaction-bridge.ts, kimi-native-session/src/kimi-native-session-facade.ts` + paired tests/docs; expected commit: `feat: bridge Kimi native session interactions`). Result: Completed in commit `feat: bridge Kimi native session interactions`.
36. [DONE] Git Commit: `feat: bridge Kimi native session interactions` (hash: self)
37. [DONE] `harness-ai.phase7.stream1.task5` Route Kimi sessions by profile kind in the provider adapter: accept `ProviderSessionStartOptions`, delegate `profileKind: "native"` sessions to the kimi-native-session driver, keep managed sessions on the universal client and really apply the materialized managed profile there (profile system prompt as the turn's system message plus tooling-category filtering of builtin tools); cover both routes and managed application with tests and synchronize adapter docs (scope — this task is explicitly split as 4 functional files because the native driver gains the per-turn Core session model with the routing: `kimi-client-provider/src/kimi-client-provider-facade.ts, kimi-client-provider/src/kimi-managed-profile-application.ts, kimi-native-session/src/kimi-native-session-runtime.ts, kimi-native-session/src/kimi-native-session-facade.ts` + paired tests/docs; expected commit: `feat: route Kimi sessions by profile kind`). Result: Completed in commit `feat: route Kimi sessions by profile kind`.
38. [DONE] Git Commit: `feat: route Kimi sessions by profile kind` (hash: self)
39. [DONE] `harness-ai.phase7.stream1.task6` Rewrite the superseded "no ACP session provider returns" statements across architecture docs, cluster/module docs, product-tree purposes and load-bearing code comments to the new profile-selective truth (native profile -> ACP CLI backend inside `kimi-client`, managed -> universal client; the standalone `kimi` provider id stays retired) (scope: `docs/architecture/SessionProfilesV2.md, provider-adapters/cluster.md, .harness/product-tree/**` + related module docs/comments via `docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: record Kimi profile-selective routing`). Result: Completed in commit `docs: record Kimi profile-selective routing`.
40. [DONE] Git Commit: `docs: record Kimi profile-selective routing` (hash: self)
41. [DONE] `harness-ai.phase7.stream1.task7` After explicit user confirmation, package the app for user verification (`npm run package:mac`) and record package evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: package Kimi profile routing build`). Result: Completed in commit `chore: package Kimi profile routing build`.
42. [DONE] Git Commit: `chore: package Kimi profile routing build` (hash: self)
43. [DONE] `harness-ai.phase7.stream1.task8` User verifies a native-profile Kimi session runs through the installed Kimi CLI (native system prompt/tools visible in behavior) and a managed-profile Kimi session runs through the universal client with the profile prompt applied (completion: user-acceptance; scope: user workflow; expected commit: none). Result: Superseded by the 2026-07-17 defect feedback (plan migration): the user reported missing thinking bubbles, subagent visibility, status-panel telemetry and top limits; acceptance moves to `harness-ai.phase8.stream1.task8`, which covers routing plus the telemetry fixes together.

## Phase 8 - Kimi Native Session Telemetry (owner: Codex, updated: 2026-07-17)

### Stream: Subagents, Status Panel, Limits And Thinking

44. [DONE] `harness-ai.phase8.stream1.task1` Extend the active scope with the Kimi session telemetry stream fixing the 2026-07-17 defect feedback: native subagent visibility, status-panel Tokens/Cache/Turns, top usage limits and best-effort thinking (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: add Kimi session telemetry stream`). Result: Completed in commit `plan: add Kimi session telemetry stream`.
45. [DONE] Git Commit: `plan: add Kimi session telemetry stream` (hash: self)
46. [DONE] `harness-ai.phase8.stream1.task2` Surface Kimi native subagents: synthesize the provider-neutral subagent lifecycle from `Agent`/`AgentSwarm` tool calls (spawn control+session on the tool call with a `kimi-agent-<toolCallId>` child id, task from streamed `rawInput.description`/`prompt`, agent role from the result's `actual_subagent_type`, terminal status from the completed/failed tool update) so the dialog shows the same subagent divider as Claude/Codex; cover the synthesis with tests and synchronize module docs (scope — this task is explicitly split as 4 functional files because the emitted union widens to subagent events and the parent provider session id must reach the normalizer: `kimi-native-session/src/kimi-subagent-normalizer.ts, kimi-native-session/src/kimi-session-event-normalizer.ts, kimi-native-session/src/kimi-native-session-runtime.ts, kimi-native-session/src/kimi-native-session-facade.ts` + paired tests/docs; expected commit: `feat: surface Kimi native subagents`). Result: Completed in commit `feat: surface Kimi native subagents`.
47. [DONE] Git Commit: `feat: surface Kimi native subagents` (hash: self)
48. [IN_PROGRESS] `harness-ai.phase8.stream1.task3` Read Kimi native token usage from the CLI session store: locate `sessions/*/<acpSessionId>/agents/main/wire.jsonl` in the real provider home, take the latest `usage.record`/`step.end` row (`used = inputOther+output+inputCacheRead+inputCacheCreation`, `cached = inputCacheRead`, limit from the config `max_context_size` with the verified 262144 default) and emit the shared `token_usage` stream event after every native turn (the CLI sends no live `usage_update`); cover row parsing and turn-end emission with tests (scope: `kimi-native-session/src/kimi-session-usage-reader.ts, kimi-native-session/src/kimi-native-session-runtime.ts` + paired tests/docs; expected commit: `feat: read Kimi native token usage`).
49. [TODO] Git Commit: `feat: read Kimi native token usage` (hash: TBD)
50. [TODO] `harness-ai.phase8.stream1.task4` Declare Kimi in the Core status-panel capability tables: `kimi-client` shows Cache and Turns (no rollback), the default token limit becomes the verified native context `262144`, and the default cached counter starts at `0` like the other cache-capable providers; cover the capability set with tests and synchronize telemetry docs (scope: `usage-context-telemetry/src/usage-context-status-panel.ts` + paired tests/docs; expected commit: `feat: enable Kimi status panel telemetry`).
51. [TODO] Git Commit: `feat: enable Kimi status panel telemetry` (hash: TBD)
52. [TODO] `harness-ai.phase8.stream1.task5` Broadcast Kimi usage limits to the top panel: restore the verified `GET https://api.kimi.com/coding/v1/usages` reader (Bearer key from the Harness kimi-client auth store with the CLI config-TOML `api_key` fallback; `limits[0].detail` -> 5h bucket, `usage` -> weekly bucket) behind `refreshUsageLimits` on the Kimi adapter for both native and client sessions, and register `kimi-client` in the pending/scope/fallback label tables; cover payload parsing and broadcast with tests (scope: `kimi-client-provider/src/kimi-usage-limits.ts, kimi-client-provider/src/kimi-client-provider-facade.ts, usage-context-telemetry/src/usage-context-telemetry-facade.ts` + paired tests/docs; expected commit: `feat: broadcast Kimi usage limits`).
53. [TODO] Git Commit: `feat: broadcast Kimi usage limits` (hash: TBD)
54. [TODO] `harness-ai.phase8.stream1.task6` Request Kimi native thinking best-effort: send `session/set_config_option {thinking, "on"}` at session open, keep the session alive on refusal and surface one honest diagnostic stream event (CLI `0.26.0` rejects the advertised option with `Internal error`; config-aliased models do not expose it at all — document the limitation); cover the request and refusal paths with tests (scope: `kimi-native-session/src/kimi-native-session-runtime.ts` + paired tests/docs; expected commit: `feat: request Kimi native thinking best effort`).
55. [TODO] Git Commit: `feat: request Kimi native thinking best effort` (hash: TBD)
56. [TODO] `harness-ai.phase8.stream1.task7` Package the app for user verification (`npm run package:mac`; packaging pre-authorized by the user's 2026-07-17 defect order) and record package evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: package Kimi telemetry build`).
57. [TODO] Git Commit: `chore: package Kimi telemetry build` (hash: TBD)
58. [TODO] `harness-ai.phase8.stream1.task8` User verifies in the packaged app: a native Kimi session shows the subagent launch divider, the lower panel shows context window/Cache/Turns, the top panel shows 5h/weekly limits, and accepts the documented thinking limitation together with the profile-selective routing (completion: user-acceptance; scope: user workflow; expected commit: none).
