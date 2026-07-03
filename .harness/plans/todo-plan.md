# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-profiles-v2-plan-document-2026-07-02",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase6b.stream1.task15",
  "expectedCommitMessage": "feat(capture-proxy): forward websocket upgrade and decode request frame",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user discussion (2026-07-02): the v1 category
  whitelist silently cuts real provider tools (Claude native stack has 10
  tools, proxy-captured; `Agent`/`Skill`/`ToolSearch`/`ScheduleWakeup` are
  always cut), the fixed category vocabulary gives the user nothing real to
  choose from, and editing three documents per profile is inconvenient. The
  user ordered a new planning document as the base for this todo-plan:
  single `profile.md` document (frontmatter + prompt body, clean break, no
  compatibility), provider tool inventory (Claude SDK `init` capture +
  probe, GLM adapter export), deny-list "vendor set minus off" semantics,
  Profile Creator tool selection. Codex/Kimi channels are an explicitly open
  question to be discussed separately before their phases are planned.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `docs/architecture/SessionProfiles.md`
- Keep the context pack short. Use `docs/DOCUMENTATION_INDEX.md` to choose the
  few documents relevant to this scope; do not paste a full Markdown inventory
  into every plan.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for
  workflow, settings, provider state, limits, tokens, reasoning, artifacts or
  orchestration.
- Any source change updates every related Markdown document in the same commit:
  affected `module.md`, `cluster.md`, `product-part.md`, architecture docs,
  product tree docs, README/AGENTS/CLAUDE when relevant, and any related
  `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are
  added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan — it may only suggest it and wait for the user's direct order.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Session Profiles V2 Planning Document (owner: Codex + User, updated: 2026-07-02)

### Stream: Planning Document And Review

1. [DONE] `harness-ai.phase1.stream1.task1` Write the session profiles v2 planning document capturing the agreed decisions (single `profile.md` with YAML frontmatter + prompt body, clean break without v1 compatibility, provider tool inventory with Claude SDK `init` capture + on-demand probe and GLM adapter export, deny-list "vendor set minus off" application semantics with exact tool names replacing the v1 category vocabulary, Profile Creator tool selection UI, Codex/Kimi channels as an explicitly open question) plus the phase roadmap for expanding this plan (scope: `docs/architecture/SessionProfilesV2.md` (new), `docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): add session profiles v2 planning document`). Result: Completed in commit `docs(architecture): add session profiles v2 planning document`.
2. [DONE] Git Commit: `docs(architecture): add session profiles v2 planning document` (hash: self)
3. [DONE] `harness-ai.phase1.stream1.task3` User review findings, round 1 (chat, 2026-07-02): (a) the universal profile stays the primary model — a per-provider application is derived from the one shared document instead of six near-identical copies (the "architect" profile example), so the frontmatter `tooling:` becomes a flat list of exact tool names where an unlabeled name applies to every provider whose inventory has it and a `@<providerId>` label narrows a name to one provider; (b) prompt universality is explicitly NOT proven — the CodeAI-Hub experiment (GLM 5.2 answering with the Claude system prompt noticeably better than with its own) means the "multi-profile vs per-provider prompt+tooling tuning" decision requires a research phase (comparative quality runs) recorded as a new open question and a roadmap Phase R; update `docs/architecture/SessionProfilesV2.md` accordingly. Plan state repair note: the open review task `task2` returned to [TODO] below and this findings task was inserted before it so the machine-managed flow resumes the review after this commit (scope: `docs/architecture/SessionProfilesV2.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): capture v2 review findings on flat tool labels and prompt research`). Result: Completed in commit `docs(architecture): capture v2 review findings on flat tool labels and prompt research`.
4. [DONE] Git Commit: `docs(architecture): capture v2 review findings on flat tool labels and prompt research` (hash: self)
5. [DONE] `harness-ai.phase1.stream1.task4` User review findings, round 2 (chat, 2026-07-02): (a) fix the GLM 5.2 experiment fact — GLM has no own system prompt to take (no CLI, ZCode desktop is closed); the CodeAI-Hub comparison was between the Claude and Codex system prompts, and Claude's won; (b) capturing native references is agreed as a v2 decision: the open-source `claude-tap` local proxy (MIT, reverse mode for Claude Code / Codex CLI / Kimi CLI, JSONL traces + ctap/HTML export, auth headers auto-redacted) is the dev-time instrument to periodically capture real system prompts and full tool schemas, converted into readable markdown reference dumps (CodeAI-Hub format); GLM needs no capture (our adapter owns its stack); the Codex/Kimi open question narrows to application channels only; Phase R expands with native capture and prompt section analysis (immutable vs excessive blocks). Plan state repair note: the open review task `task2` returned to [TODO] below again and this findings task was inserted before it (scope: `docs/architecture/SessionProfilesV2.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): adopt claude-tap native capture and correct glm prompt experiment fact`). Result: Completed in commit `docs(architecture): adopt claude-tap native capture and correct glm prompt experiment fact`.
6. [DONE] Git Commit: `docs(architecture): adopt claude-tap native capture and correct glm prompt experiment fact` (hash: self)
7. [DONE] `harness-ai.phase1.stream1.task5` User review findings, round 3 (chat, 2026-07-02): borrow only what we need from claude-tap instead of adopting it — the server response is not needed for capture (the system prompt is `body.system`, the tool schemas are `body.tools`, proven by the CodeAI-Hub `request_captured` dump), the app/GUI/viewer/14-client breadth is not needed (we drive three CLIs in reverse mode), and the raw request material must be transformed by our own converter into readable dumps; decision 5 becomes an in-house minimal Node dev-time capture module (transit-forward reverse proxy recording only the request body, headers never written so auth secrets cannot leak; claude-tap stays the mechanics reference; the no-network fake-response alternative is rejected for MVP as it would emulate three response protocols), with the Claude probe running through our own adapter env; update `docs/architecture/SessionProfilesV2.md` and the documentation index entry accordingly. Plan state repair note: the open review task `task2` returned to [TODO] below again and this findings task was inserted before it (scope: `docs/architecture/SessionProfilesV2.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): replace claude-tap adoption with an in-house native capture module`). Result: Completed in commit `docs(architecture): replace claude-tap adoption with an in-house native capture module`.
8. [DONE] Git Commit: `docs(architecture): replace claude-tap adoption with an in-house native capture module` (hash: self)
9. [DONE] `harness-ai.phase1.stream1.task6` User review findings, round 4 (chat, 2026-07-02): the reference project already implements native capture — decision 5 now ports the behavior of the CodeAI-Hub "Provider Native Request Capture" architecture (released `1.2.62`, `packages/core/src/provider-network-capture/**`, archived plan document) instead of a from-scratch transit proxy: capture-and-abort CONNECT MITM proxy with a diagnostic CA (the request never reaches the vendor; no tokens spent), deterministic probe prompt, target filtering, credential-header redaction, paired `{jsonl,md}` artifacts with extracted system/tools/messages sections, a `Native Request Capture` Settings card per provider, Claude via SDK env (`HTTPS_PROXY`+`NODE_EXTRA_CA_CERTS`), Codex via an isolated temporary app-server (`SSL_CERT_FILE`), Kimi as a new Harness AI part with a CA-trust preflight risk; claude-tap demoted to an external cross-check; the CodeAI-Hub `Capture Workbench` backlog concept (paired Vanilla vs Managed captures for line diff) is recorded as the methodological base for Phase R. Plan state repair note: the open review task `task2` returned to [TODO] below again and this findings task was inserted before it (scope: `docs/architecture/SessionProfilesV2.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): port codeai-hub native request capture architecture into v2 plan`). Result: Completed in commit `docs(architecture): port codeai-hub native request capture architecture into v2 plan`.
10. [DONE] Git Commit: `docs(architecture): port codeai-hub native request capture architecture into v2 plan` (hash: self)
11. [DONE] `harness-ai.phase1.stream1.task7` User review findings, round 5, and plan expansion (chat, 2026-07-02): Phase R is gated on obtaining at least three native pairs (system prompt + system tooling) from three providers, so the capture tool is built first; the user directs that Provider Native Request Capture be ported as a standalone Core cluster `provider-network-capture` that also lets the user pick the model (different models really have different prompts), with Kimi included as a full provider; reorder the roadmap (capture Phases 2-6 before Phase R, then profile-store v2 / tool-inventory / tooling application / Profile Creator as Phases 7-10) and lay out the capture implementation Phases 2-6 as microtasks in this plan (scope: `docs/architecture/SessionProfilesV2.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): standalone capture cluster with model choice and expand plan with capture phases`). Result: Completed in commit `docs(architecture): standalone capture cluster with model choice and expand plan with capture phases`.
12. [DONE] Git Commit: `docs(architecture): standalone capture cluster with model choice and expand plan with capture phases` (hash: self)

## Phase 2 - Provider Network Capture Cluster (owner: Codex, updated: 2026-07-02)

### Stream: Diagnostic Proxy And Artifact Writer

13. [DONE] `harness-ai.phase2.stream1.task1` Bootstrap the standalone Core cluster `provider-network-capture` and its `capture-artifacts` module: register the cluster/module in the product tree, add `cluster.md` and `module.md`, and implement the capture types + credential-header redaction + JSONL/markdown writer facade (paired `<timestamp>-<provider>-native-request.{jsonl,md}` with extracted system/tools/messages sections, request body kept, auth headers redacted) with a unit test (scope: `.harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md, product-parts/core-runtime/clusters/provider-network-capture/cluster.md, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/module.md, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs`; expected commit: `feat(provider-network-capture): bootstrap cluster with capture artifact writer`). Result: Completed in commit `feat(provider-network-capture): bootstrap cluster with capture artifact writer`.
14. [DONE] Git Commit: `feat(provider-network-capture): bootstrap cluster with capture artifact writer` (hash: self)
15. [DONE] `harness-ai.phase2.stream1.task2` Add the `capture-certificates` module: a diagnostic CA / host certificate store under the Harness home diagnostics dir, reused across runs, exposing env hints (`NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`) for provider capture, with a unit test; register the module in the product tree (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-certificates/module.md, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-certificates/src/capture-certificates-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-certificates/src/capture-certificates.test.mjs, .harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md`; expected commit: `feat(provider-network-capture): add diagnostic certificate store`). Result: Completed in commit `feat(provider-network-capture): add diagnostic certificate store`.
16. [DONE] Git Commit: `feat(provider-network-capture): add diagnostic certificate store` (hash: self)
17. [DONE] `harness-ai.phase2.stream1.task3` Add the `capture-proxy` module: a local CONNECT MITM proxy on 127.0.0.1 that terminates TLS with the diagnostic CA, reads the full request head/body, filters target model endpoints from background traffic, records via the artifact writer, and aborts with a synthetic error before any upstream forward (capture-and-abort), with a unit test capturing a fake HTTPS POST; register the module (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/module.md, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy.test.mjs, .harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md`; expected commit: `feat(provider-network-capture): add capture-and-abort mitm proxy`). Result: Completed in commit `feat(provider-network-capture): add capture-and-abort mitm proxy`.
18. [DONE] Git Commit: `feat(provider-network-capture): add capture-and-abort mitm proxy` (hash: self)
19. [DONE] `harness-ai.phase2.stream1.task4` Add the `capture-orchestrator` module: the command-level facade that validates the `(providerId, model)` request, mints a capture id, starts the proxy + certificate store, invokes the provider adapter capture method, applies the timeout/target rules, and returns the artifact paths result; register the module (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/module.md, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator.test.mjs, .harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md`; expected commit: `feat(provider-network-capture): add capture orchestrator facade`). Result: Completed in commit `feat(provider-network-capture): add capture orchestrator facade`.
20. [DONE] Git Commit: `feat(provider-network-capture): add capture orchestrator facade` (hash: self)

## Phase 3 - Provider Capture Adapters (owner: Codex, updated: 2026-07-02)

### Stream: Align Existing Adapter Capture To Record-Only Native

> Discovery (2026-07-02): the Claude/Codex/Kimi (and GLM-OpenCode) provider
> adapters already carry fully-ported native request capture services from
> CodeAI-Hub, but orphaned (no Core orchestration/RPC/UI calls them). Decision:
> Variant A — align Core to the existing adapter capture, but remove the
> comparison functionality (managed-vs-vanilla `captureMode`, Capture
> Workbench, `appliedTurnConfig`, Codex translation scenario, Kimi
> `scenarioId`) and keep only single-capture RECORDING. User decision
> (2026-07-02): record the NATIVE VENDOR DEFAULT request (vanilla path —
> provider defaults, no Harness system-prompt/tool injection), because the
> whole feature goal is native reference dumps for building profiles. So the
> record-only path keeps the vanilla/native branch as the sole behavior and
> drops the managed-injection branch.

21. [DONE] `harness-ai.phase3.stream1.task1` Strip the Claude native capture service to record-only native default: remove the `captureMode`/`appliedTurnConfig` managed branch in `buildQueryOptions` (no `systemPrompt`/`tools`/`settingSources:[]` injection) so capture records the vendor-default request; make proxy fields (`certificateEnv`/`certificatePath`/`proxyUrl`) the record-only shape and keep the `recordAppliedInputEnvelope` callback; tree stays green (contract method added later) (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/diagnostics/claude-native-request-capture-service.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/provider/claude-provider-adapter.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/module.md`; expected commit: `refactor(claude-provider): record native default request only`). Result: Completed in commit `refactor(claude-provider): record native default request only`.
22. [DONE] Git Commit: `refactor(claude-provider): record native default request only` (hash: self)
23. [DONE] `harness-ai.phase3.stream1.task2` Strip the Codex native capture service to record-only native default: remove the `captureMode` managed workflow-profile injection and the translation-capture scenario path so capture starts an isolated temporary app-server with vendor defaults; delete the now-dead `codex-native-translation-capture-profile.ts` and the codex-provider `codex-workflow-instruction-profile.ts` (only consumed by capture) to satisfy Knip; keep `recordAppliedInputEnvelope`/`recordDiagnosticContext` callbacks (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/diagnostics/codex-native-request-capture-service.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/diagnostics/codex-native-translation-capture-profile.ts (delete), product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-workflow-instruction-profile.ts (delete), plus codex-provider `module.md` and `docs/DOCUMENTATION_INDEX.md`; expected commit: `refactor(codex-provider): record native default request only`). Result: Completed in commit `refactor(codex-provider): record native default request only`.
24. [DONE] Git Commit: `refactor(codex-provider): record native default request only` (hash: self)
25. [DONE] `harness-ai.phase3.stream1.task3` Trim the Kimi wire-only native capture to record-only: drop the `scenarioId` comparison field from `KimiNativeRequestCaptureOptions` and its usage; keep the wire-only mechanism (records the applied-input-envelope with `wireJsonlPath` and the `kimi_wire_capture` diagnostic context; no MITM proxy) (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/reference/provider/kimi-provider-types.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/reference/provider/kimi-provider-adapter.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/module.md`; expected commit: `refactor(kimi-provider): record-only wire capture`). Result: Completed in commit `refactor(kimi-provider): record-only wire capture`.
26. [DONE] Git Commit: `refactor(kimi-provider): record-only wire capture` (hash: self)
27. [DONE] `harness-ai.phase3.stream1.task4` Remove the orphaned GLM-OpenCode `captureNativeRequest` (GLM is out of the capture scope — Claude/Codex/Kimi only) so it does not collide with the shared optional contract method, and delete its capture service if now unused; update docs (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/glm-opencode-provider/src/reference/provider/glm-opencode-provider-adapter.ts, its capture service file (delete if unused), plus glm-opencode-provider `module.md` and `docs/DOCUMENTATION_INDEX.md` when a file is deleted; expected commit: `chore(glm-opencode-provider): remove out-of-scope native capture`). Result: Completed in commit `chore(glm-opencode-provider): remove out-of-scope native capture`.
28. [DONE] Git Commit: `chore(glm-opencode-provider): remove out-of-scope native capture` (hash: self)
29. [DONE] `harness-ai.phase3.stream1.task5` Add the shared record-only capture contract: `ProviderNativeCaptureOptions` (required `captureId`/`workspacePath`/`probePrompt`; optional `selectedModelId`/`workflowPrompt`/`certificateEnv`/`certificatePath`/`proxyUrl`/`recordAppliedInputEnvelope`/`recordDiagnosticContext`) and `ProviderNativeCaptureAppliedInputEnvelope`, plus the optional `captureNativeRequest?(options)` on `ProviderAdapter` (Core treats a missing method as `provider_not_supported`; `isProviderAdapter` guard stays unchanged); expose the capturable model catalog (`getCapturableModels`/`getCaptureProviderIds`) from `provider-descriptor` (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/module.md, product-parts/provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.ts` plus provider-descriptor `module.md`; expected commit: `feat(provider-adapter-contract): add record-only native capture contract and capturable models`). Result: Completed in commit `feat(provider-adapter-contract): add record-only native capture contract and capturable models`.
30. [DONE] Git Commit: `feat(provider-adapter-contract): add record-only native capture contract and capturable models` (hash: self)
31. [DONE] `harness-ai.phase3.stream1.task6` Add applied-input-envelope and diagnostic-context records to the capture writer so the Kimi wire-only artifact (no intercepted HTTP request) is still a complete dump: `NativeRequestCaptureWriter.recordAppliedInputEnvelope(envelope)` and `recordDiagnosticContext(record)`, plus an `applied_input_envelope` markdown section that renders envelope fields (and `wireJsonlPath`) without regressing the Claude/Codex captured-request output (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/module.md`; expected commit: `feat(capture-artifacts): record applied-input-envelope and diagnostic context`). Result: Completed in commit `feat(capture-artifacts): record applied-input-envelope and diagnostic context`.
32. [DONE] Git Commit: `feat(capture-artifacts): record applied-input-envelope and diagnostic context` (hash: self)
33. [DONE] `harness-ai.phase3.stream1.task7` Align the orchestrator to the adapter contract and add the Kimi wire-only branch: extend `ProviderCaptureContext` with `captureId`, `certificatePath: string | null`, nullable `proxyUrl`/`certificateEnv`, and the `recordAppliedInputEnvelope`/`recordDiagnosticContext` callbacks wired to the new writer methods (mint the capture id once and reuse); split `capture()` into `#captureViaProxy` (Claude/Codex) and `#captureWireOnly` (Kimi: skip certificates/proxy, run `runProviderCapture` directly, complete `captured`/`failed`) (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/module.md`; expected commit: `feat(capture-orchestrator): capture id, envelope callbacks and kimi wire-only path`). Result: Completed in commit `feat(capture-orchestrator): capture id, envelope callbacks and kimi wire-only path`.
34. [DONE] Git Commit: `feat(capture-orchestrator): capture id, envelope callbacks and kimi wire-only path` (hash: self)

## Phase 4 - Capture Command Surface (owner: Codex, updated: 2026-07-02)

### Stream: RPC And Electron Bridge

35. [DONE] `harness-ai.phase4.stream1.task1` Add the Core RPC surface: `capture-native-request` (looks up the provider adapter, delegates to the capture orchestrator with `runProviderCapture: (ctx) => adapter.captureNativeRequest(ctx)`, returns `{ ok, markdownPath, jsonlPath, error }`) and `list-capturable-models` (per-provider model list from `provider-descriptor`), wired into the Core runtime API dispatch (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `feat(core-runtime-process): add native request capture rpc`). Result: Completed in commit `feat(core-runtime-process): add native request capture rpc`.
36. [DONE] Git Commit: `feat(core-runtime-process): add native request capture rpc` (hash: self)
37. [DONE] `harness-ai.phase4.stream1.task2` Bridge the capture command to the renderer: add the IPC channels and `window.harnessCore` methods (`captureNativeRequest`, `listCapturableModels`) in the Electron core-process bridge and preload, plus the renderer type declarations (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`; expected commit: `feat(electron-host): bridge native request capture command`). Result: Completed in commit `feat(electron-host): bridge native request capture command`.
38. [DONE] Git Commit: `feat(electron-host): bridge native request capture command` (hash: self)

## Phase 5 - Capture UI (owner: Codex, updated: 2026-07-02)

### Stream: Settings Capture Card

39. [DONE] `harness-ai.phase5.stream1.task1` Add the approved English `ui_labels`/`ui_helper_text`/`messages_for_the_user` dictionary entries for the Native Request Capture card (title, description, provider/model labels, capture button, capturing/failed states, artifact path labels) so the UI copy ships through the localization runtime (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md`; expected commit: `feat(localization-runtime): add native request capture card labels`). Result: Completed in commit `feat(localization-runtime): add native request capture card labels`.
40. [DONE] Git Commit: `feat(localization-runtime): add native request capture card labels` (hash: self)
41. [DONE] `harness-ai.phase5.stream1.task2` Add the `Native Request Capture` card to Settings -> General: provider selector + model selector (populated from `listCapturableModels`), a Capture button per run, capturing/failed status, and the resulting `.md`/`.jsonl` artifact paths; the renderer only submits the Core capture command and renders the Core-returned result (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/native-capture-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-tab-content.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `feat(provider-settings-ui): add native request capture settings card`). Result: Completed in commit `feat(provider-settings-ui): add native request capture settings card`.
42. [DONE] Git Commit: `feat(provider-settings-ui): add native request capture settings card` (hash: self)

## Phase 6 - Package & Native Pair Capture (owner: Codex + User, updated: 2026-07-02)

### Stream: Package And Capture

43. [DONE] `harness-ai.phase6.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-02.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with provider network capture`). Result: Completed in commit `chore(package): rebuild packaged app with provider network capture`.
44. [DONE] Git Commit: `chore(package): rebuild packaged app with provider network capture` (hash: self)
> Discovery (2026-07-03, Codex capture review): the packaged-app Codex capture
> recorded a bodiless `GET /backend-api/codex/responses` WebSocket upgrade —
> Codex CLI 0.142.5 ships the `responses_websockets` experimental transport, so
> the request payload (system + tools + messages) travels in WS frames that
> capture-and-abort never sees; worse, the recorded request was a background
> `memory_consolidation` prewarm (`x-codex-turn-metadata.request_kind=prewarm`),
> not the probe turn, because the Codex target rule has no body checks. The
> system prompt still landed via the rollout diagnostic context
> (`base_instructions`), but tool schemas are missing, so the Codex pair is
> incomplete. Binary/CLI research confirmed `codex app-server --disable
> <feature>` (equivalent to `-c features.<name>=false`) covers
> `responses_websockets`/`responses_websockets_v2`. `chatgpt-account-id` also
> escaped header redaction. User agreed (2026-07-03) to fix transport +
> filtering + redaction, repackage, and re-capture. Plan state repair note: the
> open user-capture task `task2` returned to [TODO] below and the fix tasks
> were inserted before it so the machine-managed flow resumes the capture
> after these commits.

45. [DONE] `harness-ai.phase6.stream1.task3` Force vendor-default HTTP transport for Codex capture: add a dedicated `codex:native-capture` app-server process profile that disables the `responses_websockets` and `responses_websockets_v2` features via repeatable `--disable` args and switch the Codex native request capture service to that profile, so the probe turn posts the full request body (system instructions + tool schemas) through the capture-and-abort proxy instead of a bodiless WebSocket upgrade; record the WebSocket-transport discovery in the v2 planning document (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/process/codex-app-server-process-profile.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/diagnostics/codex-native-request-capture-service.ts, plus codex-provider module.md, docs/architecture/SessionProfilesV2.md and .harness/plans/todo-plan.md`; expected commit: `fix(codex-provider): force http transport for native capture`) Result: Completed in commit `fix(codex-provider): force http transport for native capture`.
46. [DONE] Git Commit: `fix(codex-provider): force http transport for native capture` (hash: self)
47. [DONE] `harness-ai.phase6.stream1.task4` Teach the capture proxy to match target requests by body content: add the optional `bodyIncludes` field to `NativeCaptureTargetRule` and reject non-matching requests in `resolveRuleMismatch` as `request_body_not_matched` (the connection ends, the capture keeps waiting for the real probe request), with a unit test (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy.test.mjs, plus capture-proxy module.md`; expected commit: `feat(capture-proxy): match target requests by body content`) Result: Completed in commit `feat(capture-proxy): match target requests by body content`.
48. [DONE] Git Commit: `feat(capture-proxy): match target requests by body content` (hash: self)
49. [DONE] `harness-ai.phase6.stream1.task5` Harden the Codex capture target rule and surface proxy noise: require `minimumToolCount: 1` plus `bodyIncludes` (the diagnostic probe prompt) on the Codex default rule so background prewarm/memory-consolidation requests to the same endpoint are ignored instead of ending the capture, and forward capture proxy events (`proxy_connect`/`request_ignored`) into the artifact writer as `proxy_event` diagnostic context records, with a unit test (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator.test.mjs, plus capture-orchestrator module.md`; expected commit: `feat(capture-orchestrator): filter codex probe request and log proxy events`) Result: Completed in commit `feat(capture-orchestrator): filter codex probe request and log proxy events`.
50. [DONE] Git Commit: `feat(capture-orchestrator): filter codex probe request and log proxy events` (hash: self)
51. [DONE] `harness-ai.phase6.stream1.task6` Extend credential-header redaction to account identifiers: the captured Codex request exposed `chatgpt-account-id` in the artifact headers, so add an `account-id` pattern to the capture header redaction regex with a unit test (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs, plus capture-artifacts module.md`; expected commit: `fix(capture-artifacts): redact account id headers`) Result: Completed in commit `fix(capture-artifacts): redact account id headers`.
52. [DONE] Git Commit: `fix(capture-artifacts): redact account id headers` (hash: self)
53. [DONE] `harness-ai.phase6.stream1.task7` Package the app with the capture transport/filter/redaction fixes for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with codex capture transport fix`) Result: Completed in commit `chore(package): rebuild packaged app with codex capture transport fix`.
54. [DONE] Git Commit: `chore(package): rebuild packaged app with codex capture transport fix` (hash: self)
> Discovery (2026-07-03, second Codex capture — `target_not_seen`): the
> `codex:native-capture` HTTP transport worked (proxy now sees path-level
> requests, not a bodiless WS upgrade), and the probe turn reached
> `chatgpt.com/backend-api/codex/responses` — the artifact shows `3×
> request_body_not_matched` on that endpoint (Codex retries after the proxy
> ends each rejected connection) plus background `request_path_not_matched`.
> So the probe request arrives WITH a body but the Codex body rule rejects it.
> The combined `request_body_not_matched` reason hides which check failed
> (`minimumToolCount: 1` vs `bodyIncludes`) and rejected bodies are not
> written, so the exact cause is invisible. The system prompt still lands in
> the rollout `base_instructions` (21335 chars); only the tool schemas (body
> only) are missing. Fix chosen with the user: drop the `minimumToolCount`
> AND-condition (suspected false reject — Codex Responses API likely nests
> tools outside top-level `body.tools`), keeping the specific `bodyIncludes`
> probe matcher; and record a safe diagnostic detail on body-rejected
> matched-path requests so the true cause is visible next time. Plan state
> repair note: the open user-capture task `task2` returned to [TODO] below and
> the fix tasks were inserted before it.

55. [DONE] `harness-ai.phase6.stream1.task8` Diagnose body-rejected target requests in the capture proxy: when a request matches the rule host+path but fails the body checks, attach a safe `detail` to the `request_ignored` event (`bodyBytes`, `hasContentLength`, `probeMatched`, `toolCount`, `topLevelKeys` — structural metadata only, never header/body values) so the artifact's `capture_proxy_event` records reveal why the Codex probe body was rejected (chunked/no-content-length empty body vs tool-count vs probe text), with a unit test (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy.test.mjs, plus capture-proxy module.md`; expected commit: `feat(capture-proxy): diagnose body-rejected target requests`) Result: Completed in commit `feat(capture-proxy): diagnose body-rejected target requests`.
56. [DONE] Git Commit: `feat(capture-proxy): diagnose body-rejected target requests` (hash: self)
57. [DONE] `harness-ai.phase6.stream1.task9` Relax the Codex capture body filter to the probe matcher only: drop `minimumToolCount: 1` from the Codex default target rule (Codex Responses API nests tools outside top-level `body.tools`, so requiring it falsely rejected the probe turn) and keep `bodyIncludes` (the diagnostic probe prompt) as the sole body discriminator against background prewarm turns, updating the orchestrator unit test accordingly (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator.test.mjs, plus capture-orchestrator module.md`; expected commit: `fix(capture-orchestrator): match codex probe by prompt only`) Result: Completed in commit `fix(capture-orchestrator): match codex probe by prompt only`.
58. [DONE] Git Commit: `fix(capture-orchestrator): match codex probe by prompt only` (hash: self)
59. [DONE] `harness-ai.phase6.stream1.task10` Package the app with the Codex body-filter fix and proxy diagnostics for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-codex-filter.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with codex body-filter fix`) Result: Completed in commit `chore(package): rebuild packaged app with codex body-filter fix`.
60. [DONE] Git Commit: `chore(package): rebuild packaged app with codex body-filter fix` (hash: self)
> Discovery (2026-07-03, third Codex capture — `target_not_seen` again, but now
> diagnosed): the proxy diagnostic `detail` on the 3 body-rejected
> `/backend-api/codex/responses` requests reads
> `{bodyBytes:0, hasContentLength:false, probeMatched:false, toolCount:0,
> topLevelKeys:[]}`. Root cause confirmed: Codex (Rust/reqwest) streams the
> POST body with `Transfer-Encoding: chunked` and NO `Content-Length`, and the
> proxy's `parseHttpRequest` only reads a body sized by `Content-Length` — with
> the header absent it treats the body as empty, rejects the request as
> non-probe, and ends the connection before the chunked body is read. So the
> `minimumToolCount` removal was correct but insufficient; the real fix is
> teaching the proxy to decode a chunked request body. The chunked decoder
> pushed `capture-proxy-facade.ts` over the 500-line gate, so the HTTP request
> reader was split into a sibling `capture-proxy-http.ts` (both capture tests
> compile it). Plan state repair note: the open user-capture task `task2`
> returned to [TODO] below and the fix tasks were inserted before it.

61. [DONE] `harness-ai.phase6.stream1.task11` Read chunked request bodies in the capture proxy: teach the request reader to decode a `Transfer-Encoding: chunked` body (accumulate until the terminal `0\r\n` chunk, returning null while incomplete so `handleHttpData` keeps waiting) instead of treating a missing `Content-Length` as an empty body, and add `hasTransferEncoding` to the ignored-request diagnostic detail; the HTTP request reader is extracted into a new sibling `capture-proxy-http.ts` to stay under the 500-line file gate, and a unit test captures a chunked probe POST arriving in two writes (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-http.ts` (new), `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator.test.mjs` (compile the new file) plus capture-proxy `module.md`; expected commit: `fix(capture-proxy): read chunked request bodies`) Result: Completed in commit `fix(capture-proxy): read chunked request bodies`.
62. [DONE] Git Commit: `fix(capture-proxy): read chunked request bodies` (hash: self)
63. [DONE] `harness-ai.phase6.stream1.task12` Package the app with the chunked request-body fix for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-codex-chunked.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with codex chunked body fix`) Result: Completed in commit `chore(package): rebuild packaged app with codex chunked body fix`.
64. [DONE] Git Commit: `chore(package): rebuild packaged app with codex chunked body fix` (hash: self)
## Phase 6.5 - Forward Capture Rearchitecture (owner: Codex + User, updated: 2026-07-03)

> Pivot (2026-07-03, user-approved): capture-and-abort is fundamentally
> incompatible with Codex 0.142.5, which forces an un-disableable WebSocket
> transport for `/responses` (empirically: `--disable responses_websockets`
> no longer switches transport; `-c model_providers.openai.supports_websockets`
> is rejected as a reserved built-in). The request body lives in WS frames sent
> AFTER the upgrade handshake, which requires a real server — so abort can never
> see it. Diagnostic scripts proved a forward-transit alternative works: the
> proxy forwards the WS upgrade to the real chatgpt.com (stripping
> `Sec-WebSocket-Extensions` so no permessage-deflate), decodes the first client
> text frame `{"type":"response.create","instructions","tools","input"}`, and
> extracts system/tools/messages. claude-tap has NO native WS capture (their
> TODO) — its forward architecture is the model, the deflate-strip trick is ours.
> User decisions (2026-07-03): (a) pivot Codex to forward + WS-decode; (b) the
> probe request reaching the server is acceptable (abort right after the frame
> minimizes spend); (c) unify all three providers on the forward proxy. This
> changes SessionProfilesV2 decision 5.

### Stream: Forward Proxy And Provider Unification

65. [DONE] `harness-ai.phase6b.stream1.task13` Document the forward-transit pivot: rewrite SessionProfilesV2 decision 5 (capture-and-abort -> forward-transit with request/response recording), replace the Codex HTTP-transport note with the empirically-confirmed WebSocket-mandatory finding and the forward WS-decode solution (strip `Sec-WebSocket-Extensions`, decode the `response.create` frame), update the roadmap and the application-channel note, and lay out this Phase 6.5 (scope: `docs/architecture/SessionProfilesV2.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): pivot capture to forward ws-decode transit`) Result: Completed in commit `docs(architecture): pivot capture to forward ws-decode transit`.
66. [DONE] Git Commit: `docs(architecture): pivot capture to forward ws-decode transit` (hash: self)
67. [DONE] `harness-ai.phase6b.stream1.task14` Add HTTP forward transit to the capture proxy: rework the proxy so a matched target request is forwarded to the real upstream over a TLS client connection instead of aborted — read the client request (head + body), open an upstream TLS socket to the rule host, write the request, relay the response back to the client, and resolve the captured request to the writer; keep the target-rule filter; force `ALPNProtocols: ['http/1.1']` on the client-facing TLS so HTTP providers stay HTTP/1.1, with a unit test that forwards a fake upstream (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy.test.mjs, plus capture-proxy module.md`; expected commit: `feat(capture-proxy): forward matched requests to upstream`) Result: Completed in commit `feat(capture-proxy): forward matched requests to upstream`.
68. [DONE] Git Commit: `feat(capture-proxy): forward matched requests to upstream` (hash: self)
69. [IN_PROGRESS] `harness-ai.phase6b.stream1.task15` Add WebSocket upgrade forwarding and frame decode: when a matched request is a WS upgrade, complete the `101` with the real upstream while stripping `Sec-WebSocket-Extensions` (so the server does not negotiate permessage-deflate), decode the first client text frame (unmask, handle 7/16/64-bit lengths), and treat its payload as the captured request body; a new sibling `capture-proxy-ws.ts` holds the frame codec to stay under the 500-line gate, with a unit test decoding a masked frame (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-ws.ts` (new), `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy.test.mjs` plus capture-proxy module.md; expected commit: `feat(capture-proxy): forward websocket upgrade and decode request frame`)
70. [TODO] Git Commit: `feat(capture-proxy): forward websocket upgrade and decode request frame` (hash: TBD)
71. [TODO] `harness-ai.phase6b.stream1.task16` Switch the orchestrator to the forward model and retire the WS-disable profile: drop the capture-and-abort assumptions from the orchestrator result handling, remove the now-useless `codex:native-capture` app-server profile (WS could never be disabled) so Codex capture runs the default app-server, and point the Codex target rule at the `response.create` WS payload; update the orchestrator and Codex adapter unit expectations (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/process/codex-app-server-process-profile.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/diagnostics/codex-native-request-capture-service.ts` plus the affected module.md files; expected commit: `refactor(provider-network-capture): forward-model orchestration and drop ws-disable profile`)
72. [TODO] Git Commit: `refactor(provider-network-capture): forward-model orchestration and drop ws-disable profile` (hash: TBD)
73. [TODO] `harness-ai.phase6b.stream1.task17` Extract the Codex WS `response.create` sections: teach the artifact section extractor to read `{type:"response.create", instructions, tools, input}` (instructions -> system, tools -> tools, input -> messages) so the Codex forward-WS dump renders the full pair, with a unit test (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs, plus capture-artifacts module.md`; expected commit: `feat(capture-artifacts): extract codex response.create sections`)
74. [TODO] Git Commit: `feat(capture-artifacts): extract codex response.create sections` (hash: TBD)
75. [TODO] `harness-ai.phase6b.stream1.task18` Package the app with the forward capture rearchitecture for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-forward.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with forward capture`)
76. [TODO] Git Commit: `chore(package): rebuild packaged app with forward capture` (hash: TBD)
77. [TODO] `harness-ai.phase6.stream1.task2` User captures at least three native pairs (Claude, Codex, Kimi) in the packaged app via the Native Request Capture card and confirms each `.md`/`.jsonl` artifact contains the vendor-default system prompt and tool schemas; these pairs are the input to Phase R (scope: user workflow; expected commit: none).

## Phase R - Prompt Research (deferred, owner: Codex + User, updated: 2026-07-02)

> Discussed and expanded into microtasks ONLY after Phase 6 delivers the three
> native pairs. Methodology (representative tasks, quality criteria,
> multi-profile vs layered prompt vs per-provider tuning) is decided with the
> user then. See `docs/architecture/SessionProfilesV2.md` roadmap Phases R and
> 7-10 (profile-store v2, tool-inventory, tooling application, Profile
> Creator), which stay as roadmap until Phase R closes the open questions.
