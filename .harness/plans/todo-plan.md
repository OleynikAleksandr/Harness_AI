# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-profiles-v2-plan-document-2026-07-02",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase3.stream1.task6",
  "expectedCommitMessage": "feat(capture-artifacts): record applied-input-envelope and diagnostic context",
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
31. [IN_PROGRESS] `harness-ai.phase3.stream1.task6` Add applied-input-envelope and diagnostic-context records to the capture writer so the Kimi wire-only artifact (no intercepted HTTP request) is still a complete dump: `NativeRequestCaptureWriter.recordAppliedInputEnvelope(envelope)` and `recordDiagnosticContext(record)`, plus an `applied_input_envelope` markdown section that renders envelope fields (and `wireJsonlPath`) without regressing the Claude/Codex captured-request output (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/module.md`; expected commit: `feat(capture-artifacts): record applied-input-envelope and diagnostic context`).
32. [TODO] Git Commit: `feat(capture-artifacts): record applied-input-envelope and diagnostic context` (hash: TBD)
33. [TODO] `harness-ai.phase3.stream1.task7` Align the orchestrator to the adapter contract and add the Kimi wire-only branch: extend `ProviderCaptureContext` with `captureId`, `certificatePath: string | null`, nullable `proxyUrl`/`certificateEnv`, and the `recordAppliedInputEnvelope`/`recordDiagnosticContext` callbacks wired to the new writer methods (mint the capture id once and reuse); split `capture()` into `#captureViaProxy` (Claude/Codex) and `#captureWireOnly` (Kimi: skip certificates/proxy, run `runProviderCapture` directly, complete `captured`/`failed`) (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/module.md`; expected commit: `feat(capture-orchestrator): capture id, envelope callbacks and kimi wire-only path`).
34. [TODO] Git Commit: `feat(capture-orchestrator): capture id, envelope callbacks and kimi wire-only path` (hash: TBD)

## Phase 4 - Capture Command Surface (owner: Codex, updated: 2026-07-02)

### Stream: RPC And Electron Bridge

35. [TODO] `harness-ai.phase4.stream1.task1` Add the Core RPC surface: `capture-native-request` (looks up the provider adapter, delegates to the capture orchestrator with `runProviderCapture: (ctx) => adapter.captureNativeRequest(ctx)`, returns `{ ok, markdownPath, jsonlPath, error }`) and `list-capturable-models` (per-provider model list from `provider-descriptor`), wired into the Core runtime API dispatch (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `feat(core-runtime-process): add native request capture rpc`).
36. [TODO] Git Commit: `feat(core-runtime-process): add native request capture rpc` (hash: TBD)
37. [TODO] `harness-ai.phase4.stream1.task2` Bridge the capture command to the renderer: add the IPC channels and `window.harnessCore` methods (`captureNativeRequest`, `listCapturableModels`) in the Electron core-process bridge and preload, plus the renderer type declarations (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`; expected commit: `feat(electron-host): bridge native request capture command`).
38. [TODO] Git Commit: `feat(electron-host): bridge native request capture command` (hash: TBD)

## Phase 5 - Capture UI (owner: Codex, updated: 2026-07-02)

### Stream: Settings Capture Card

39. [TODO] `harness-ai.phase5.stream1.task1` Add the approved English `ui_labels`/`ui_helper_text`/`messages_for_the_user` dictionary entries for the Native Request Capture card (title, description, provider/model labels, capture button, capturing/failed states, artifact path labels) so the UI copy ships through the localization runtime (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md`; expected commit: `feat(localization-runtime): add native request capture card labels`).
40. [TODO] Git Commit: `feat(localization-runtime): add native request capture card labels` (hash: TBD)
41. [TODO] `harness-ai.phase5.stream1.task2` Add the `Native Request Capture` card to Settings -> General: provider selector + model selector (populated from `listCapturableModels`), a Capture button per run, capturing/failed status, and the resulting `.md`/`.jsonl` artifact paths; the renderer only submits the Core capture command and renders the Core-returned result (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/native-capture-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-tab-content.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `feat(provider-settings-ui): add native request capture settings card`).
42. [TODO] Git Commit: `feat(provider-settings-ui): add native request capture settings card` (hash: TBD)

## Phase 6 - Package & Native Pair Capture (owner: Codex + User, updated: 2026-07-02)

### Stream: Package And Capture

43. [TODO] `harness-ai.phase6.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-02.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with provider network capture`).
44. [TODO] Git Commit: `chore(package): rebuild packaged app with provider network capture` (hash: TBD)
45. [TODO] `harness-ai.phase6.stream1.task2` User captures at least three native pairs (Claude, Codex, Kimi) in the packaged app via the Native Request Capture card and confirms each `.md`/`.jsonl` artifact contains the vendor-default system prompt and tool schemas; these pairs are the input to Phase R (scope: user workflow; expected commit: none).

## Phase R - Prompt Research (deferred, owner: Codex + User, updated: 2026-07-02)

> Discussed and expanded into microtasks ONLY after Phase 6 delivers the three
> native pairs. Methodology (representative tasks, quality criteria,
> multi-profile vs layered prompt vs per-provider tuning) is decided with the
> user then. See `docs/architecture/SessionProfilesV2.md` roadmap Phases R and
> 7-10 (profile-store v2, tool-inventory, tooling application, Profile
> Creator), which stay as roadmap until Phase R closes the open questions.
