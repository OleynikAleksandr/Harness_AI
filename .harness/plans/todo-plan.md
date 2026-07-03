# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-profiles-v2-plan-document-2026-07-02",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase7.stream2.task38",
  "expectedCommitMessage": null,
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

## Capture Investigation Recovery Summary (Phase 6.5, updated 2026-07-03)

Zero-context recovery: read this section + the Phase 6.5 `> Discovery` notes +
`docs/architecture/SessionProfilesV2.md` decision 5. Feature = Provider Native
Request Capture: capture each vendor's real native request (system prompt + tool
schemas) as a reference dump for building session profiles (Phase R input).
Core cluster `core-runtime/.../provider-network-capture` (capture-artifacts,
capture-certificates, capture-proxy, capture-orchestrator); provider capture
services under each adapter's `diagnostics/`. Artifacts:
`~/.harness-ai/logs/native-request-capture/<ts>-<provider>-<model>-native-request.{jsonl,md}`.

ARCHITECTURE (pivoted 2026-07-03): the proxy is **forward transit**, NOT
capture-and-abort. It MITM-terminates TLS for a target host, forwards the
request to the real vendor, relays the response, and captures the first request
matching a target rule; non-target hosts are blind TCP tunnels. Forces
`ALPNProtocols: ['http/1.1']`. The request DOES reach the vendor (accepted
trade-off). `capture-proxy` module = facade + `capture-proxy-http.ts` (HTTP
request reader incl. chunked) + `capture-proxy-ws.ts` (WS upgrade forward +
masked-frame decode). Why the pivot: Codex 0.142.5 forces an un-disableable
WebSocket transport for `/responses` (`--disable responses_websockets` is dead;
`-c model_providers.openai.supports_websockets=false` rejected — `openai` is a
reserved built-in), so the payload only exists in WS frames after a real
upgrade — abort could never see it. claude-tap has NO native WS capture (their
TODO); its forward model is the reference, the `Sec-WebSocket-Extensions`
deflate-strip trick (→ plain frames) is ours.

PER-PROVIDER FINDINGS:
- **Codex** (WS transport). Confirmed working (dump 11-22-00): forward the WS
  upgrade, strip `Sec-WebSocket-Extensions`, decode EVERY frame on the reused
  connection, capture the one whose payload contains the probe prompt
  (`bodyIncludes` on the Codex rule) — NOT the first frame, which is a
  `memory_consolidation` prewarm (gpt-5.4, 8 trimmed tools). The probe turn is
  gpt-5.5 with the full 17-tool inline set. Codex tool LAYERS: 17 inline tools
  in `response.create` is the full inline contract; app-server feature flags
  (`--enable browser_use/...`) add NO tools; browser/computer/MCP tools are a
  deferred layer (`tool_search` + `AlwaysDeferMcpTools`, MCP servers start slow)
  outside `/responses`. Codex has NO `WebFetch`; web = `web_search`.
- **Claude** (HTTP POST `/v1/messages`). The claude_code-preset SDK dump
  (bebb359f, captured 2026-07-03T14-18-55) is NOT the CLI reference: the binary
  assembles the prompt BY ENTRY MODE (SDK `sdk-ts` -> SDK identity + 9 inline
  tools; `-p` -> 26 tools; interactive pty -> "You are Claude Code..." + 29-30
  tools ~23k tok) and no SDK option switches it. Native = the ORIGINAL
  interactive CLI wrapping (user frame 2026-07-03), so Phase 6.6 pivots Claude
  capture to an interactive pty run of the provider binary (python3 `pty.fork`
  driver, provider-home auth, trust pre-acceptance, self-terminating timer).
  See the Phase 6.6 discovery note for the full empirical matrix.
- **Kimi** (wire-only, no proxy). Orchestrator `captureWireOnly` branch. NOT yet
  re-captured on the forward build.

STATE: Codex pair complete (artifact currently missing from the log dir —
ask the user where it was moved before re-capturing). Claude: SDK-preset dump
exists (2026-07-03T14-18-55, claude-opus) but is superseded by the Phase 6.6
interactive-CLI pivot; re-capture after task27/28. Kimi NOT re-captured on the
forward build. task2 stays open until the user confirms all three native
pairs. Do NOT close scope (user-directed only). Diagnostic scripts live in the
session scratchpad (`diag-claude-cli-stub.mjs`, `diag-claude-pty.py`,
`analyze-body.py`; earlier `diag-codex*.mjs`) — the reusable proof method:
local stub via `ANTHROPIC_BASE_URL` or our proxy + the real vendor binary.

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
69. [DONE] `harness-ai.phase6b.stream1.task15` Add WebSocket upgrade forwarding and frame decode: when a matched request is a WS upgrade, complete the `101` with the real upstream while stripping `Sec-WebSocket-Extensions` (so the server does not negotiate permessage-deflate), decode the first client text frame (unmask, handle 7/16/64-bit lengths), and treat its payload as the captured request body; a new sibling `capture-proxy-ws.ts` holds the frame codec to stay under the 500-line gate, with a unit test decoding a masked frame (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-ws.ts` (new), `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy.test.mjs` plus capture-proxy module.md; expected commit: `feat(capture-proxy): forward websocket upgrade and decode request frame`) Result: Completed in commit `feat(capture-proxy): forward websocket upgrade and decode request frame`.
70. [DONE] Git Commit: `feat(capture-proxy): forward websocket upgrade and decode request frame` (hash: self)
71. [DONE] `harness-ai.phase6b.stream1.task16` Switch the orchestrator to the forward model and retire the WS-disable profile: drop the capture-and-abort assumptions from the orchestrator result handling, remove the now-useless `codex:native-capture` app-server profile (WS could never be disabled) so Codex capture runs the default app-server, and point the Codex target rule at the `response.create` WS payload; update the orchestrator and Codex adapter unit expectations (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/process/codex-app-server-process-profile.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/diagnostics/codex-native-request-capture-service.ts` plus the affected module.md files; expected commit: `refactor(provider-network-capture): forward-model orchestration and drop ws-disable profile`) Result: Completed in commit `refactor(provider-network-capture): forward-model orchestration and drop ws-disable profile`.
72. [DONE] Git Commit: `refactor(provider-network-capture): forward-model orchestration and drop ws-disable profile` (hash: self)
73. [DONE] `harness-ai.phase6b.stream1.task17` Extract the Codex WS `response.create` sections: teach the artifact section extractor to read `{type:"response.create", instructions, tools, input}` (instructions -> system, tools -> tools, input -> messages) so the Codex forward-WS dump renders the full pair, with a unit test (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs, plus capture-artifacts module.md`; expected commit: `feat(capture-artifacts): extract codex response.create sections`) Result: Completed in commit `feat(capture-artifacts): extract codex response.create sections`.
74. [DONE] Git Commit: `feat(capture-artifacts): extract codex response.create sections` (hash: self)
75. [DONE] `harness-ai.phase6b.stream1.task19` Correct stale capture-and-abort terminology to forward-transit across the cluster (cross-cutting label fix, no behavior change): the artifact markdown `Capture mode` line rendered `MITM capture-and-abort` (user-visible in every dump), and the orchestrator facade comment plus its module.md and the cluster.md overview still described capture-and-abort; the JSONL/markdown `sentUpstream` flag flips to true because forward transit reaches the vendor (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/module.md, product-parts/core-runtime/clusters/provider-network-capture/cluster.md`; expected commit: `refactor(provider-network-capture): correct stale capture-and-abort labels`) Result: Completed in commit `refactor(provider-network-capture): correct stale capture-and-abort labels`.
76. [DONE] Git Commit: `refactor(provider-network-capture): correct stale capture-and-abort labels` (hash: self)
77. [DONE] `harness-ai.phase6b.stream1.task18` Package the app with the forward capture rearchitecture for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-forward.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with forward capture`) Result: Completed in commit `chore(package): rebuild packaged app with forward capture`.
76. [DONE] Git Commit: `chore(package): rebuild packaged app with forward capture` (hash: self)
> Discovery (2026-07-03, first successful Codex forward capture reviewed): the
> dump captured only 8 tools on `gpt-5.4` with `request_kind: "prewarm"`,
> `thread_source: "memory_consolidation"` — a background memory-consolidation
> prewarm turn, NOT the probe turn. Diagnostics (multi-frame decode of the WS
> connection) proved Codex REUSES one WS connection for several
> `response.create` frames: prewarm frames plus our probe turn. Our probe turn
> (`probe=true`, `gpt-5.5`) carries the full deterministic native tool set (17
> tools: exec_command, write_stdin, list_mcp_resources,
> list_mcp_resource_templates, read_mcp_resource, update_plan,
> request_user_input, list_available_plugins_to_install, request_plugin_install,
> apply_patch, view_image, get_goal, create_goal, update_goal, tool_search,
> web_search, image_generation). The proxy captured the FIRST frame (a
> memory_consolidation prewarm with a trimmed 8-tool set on gpt-5.4). Fix:
> decode every frame on the WS connection and capture the one whose `input`
> contains the probe prompt.

78. [DONE] `harness-ai.phase6b.stream1.task20` Capture the probe-turn WebSocket frame, not the first prewarm frame: make `decodeWsFrame` report the consumed byte length and have `runWebSocketCapture` decode every complete frame on the connection (Codex reuses one WS connection for prewarm + real turns), capturing the first `response.create` frame whose payload contains the rule's `bodyIncludes` probe prompt while forwarding the rest; restore `bodyIncludes` (the diagnostic probe prompt) on the Codex target rule and thread it into the WS route; unit test decodes two frames and captures the probe one (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-ws.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts` plus capture-proxy `module.md`, capture-proxy `capture-proxy.test.mjs` and capture-orchestrator `capture-orchestrator.test.mjs`; expected commit: `fix(capture-proxy): capture the probe turn websocket frame`) Result: Completed in commit `fix(capture-proxy): capture the probe turn websocket frame`.
79. [DONE] Git Commit: `fix(capture-proxy): capture the probe turn websocket frame` (hash: self)
80. [DONE] `harness-ai.phase6b.stream1.task21` Package the app with the probe-turn WS-frame fix for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-probe-turn.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with probe-turn ws capture`) Result: Completed in commit `chore(package): rebuild packaged app with probe-turn ws capture`.
81. [DONE] Git Commit: `chore(package): rebuild packaged app with probe-turn ws capture` (hash: self)
> Discovery (2026-07-03, Codex tool-layer investigation): the Codex native
> inline tool set is 17 tools in the `response.create` frame. Enabling app-server
> features (`--enable browser_use/computer_use/in_app_browser/apps/multi_agent/
> memory_tool`) does NOT add tools — verified, the set stays 17. Codex's
> `browser_use`/`computer_use` and MCP-server tools (playwright, node_repl/
> cua_node) come from a separate layer: MCP servers (slow start, node_repl
> `startup_timeout_sec = 120`) plus deferred loading (`AlwaysDeferMcpTools`) via
> `tool_search`, not the inline request. So 17 is the full native inline
> contract; browser/computer/MCP schemas are a deferred/MCP layer outside
> `/responses`. User asked to record this in the architecture doc.

82. [DONE] `harness-ai.phase6b.stream1.task22` Record the Codex tool-layer findings in the architecture doc: add a short Codex-specific note to `SessionProfilesV2.md` capturing that the native inline tool set is 17 tools, that app-server feature flags do not add tools, and that `browser_use`/`computer_use`/MCP-server tool schemas live in a deferred/MCP layer (`tool_search` + `AlwaysDeferMcpTools`, MCP servers playwright/node_repl) outside the `/responses` inline contract (scope: `docs/architecture/SessionProfilesV2.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): record codex tool layers and mcp/browser findings`) Result: Completed in commit `docs(architecture): record codex tool layers and mcp/browser findings`.
83. [DONE] Git Commit: `docs(architecture): record codex tool layers and mcp/browser findings` (hash: self)
84. [DONE] `harness-ai.phase6b.stream1.task23` Put the selected model in the capture artifact filenames so dumps are distinguishable: extend the writer stem to `<timestamp>-<provider>-<model>-native-request.{jsonl,md}` (sanitize the model id to filename-safe chars; omit the model segment when no model was selected), with a unit test, and update the artifact filename format in the architecture doc (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs, capture-artifacts module.md, docs/architecture/SessionProfilesV2.md`; expected commit: `feat(capture-artifacts): include model id in artifact filenames`) Result: Completed in commit `feat(capture-artifacts): include model id in artifact filenames`.
85. [DONE] Git Commit: `feat(capture-artifacts): include model id in artifact filenames` (hash: self)
86. [DONE] `harness-ai.phase6b.stream1.task24` Package the app with the model-in-filename change for the Claude/Kimi re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-model-filename.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with model in artifact filenames`) Result: Completed in commit `chore(package): rebuild packaged app with model in artifact filenames`.
87. [DONE] Git Commit: `chore(package): rebuild packaged app with model in artifact filenames` (hash: self)
> Discovery (2026-07-03, first Claude forward capture reviewed): the Claude
> dump captured only 9 tools (Agent, Bash, Edit, Read, Write, Skill, Workflow,
> ToolSearch, ScheduleWakeup) and a 146-char system prompt ("You are a Claude
> agent, built on Anthropic's Claude Agent SDK", `cc_entrypoint=sdk-ts`) — the
> minimal Agent SDK default, NOT the full Claude Code CLI (no WebFetch,
> WebSearch, Glob, Grep, TodoWrite, no large system prompt). Root cause: the
> Claude capture service's `buildQueryOptions` sends the vanilla SDK query with
> no `systemPrompt`/`tools`/`settingSources`, so the SDK uses its minimal
> defaults. But the LIVE Claude adapter's Native profile
> (`applyClaudeSessionProfile`, kind `native`) applies the claude_code presets:
> `systemPrompt: {type:"preset", preset:"claude_code"}`, `tools:
> {type:"preset", preset:"claude_code"}`, `settingSources:
> ["user","project","local"]` — verified against the installed SDK's `sdk.d.ts`
> (preset = "Use Claude Code's default system prompt" / "Use all default Claude
> Code tools"). So capture does NOT reflect what the Native profile actually
> sends. User decision (2026-07-03): the Native baseline must send the full
> Claude Code CLI reference; fix capture to apply the same native preset as the
> live adapter (reuse `applyClaudeSessionProfile`).

88. [DONE] `harness-ai.phase6b.stream1.task25` Capture the native Claude Code CLI reference instead of the minimal Agent SDK default: apply the live Native profile's claude_code presets in the Claude capture service — reuse `applyClaudeSessionProfile({...}, {kind:"native"})` (or set `systemPrompt`/`tools` to `{type:"preset", preset:"claude_code"}` and `settingSources` to `["user","project","local"]`) in `buildQueryOptions` so the captured request is the full Claude Code system prompt + native tool set (WebFetch, WebSearch, Glob, Grep, TodoWrite, ...), matching what the Native profile sends live; update the service comment and module.md (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/diagnostics/claude-native-request-capture-service.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/module.md, docs/architecture/SessionProfilesV2.md`; expected commit: `fix(claude-provider): capture the native claude_code preset request`) Result: Completed in commit `fix(claude-provider): capture the native claude_code preset request`.
89. [DONE] Git Commit: `fix(claude-provider): capture the native claude_code preset request` (hash: self)
90. [DONE] `harness-ai.phase6b.stream1.task26` Package the app with the Claude native-preset capture fix for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-claude-preset.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with claude native preset capture`) Result: Completed in commit `chore(package): rebuild packaged app with claude native preset capture`.
91. [DONE] Git Commit: `chore(package): rebuild packaged app with claude native preset capture` (hash: self)

## Phase 6.6 - Claude Interactive CLI Capture (owner: Codex + User, updated: 2026-07-03)

> Discovery (2026-07-03, mode-dependent prompt assembly): the SDK has no own
> network stack — `query()` spawns the SAME `claude` binary (platform package
> `claude-agent-sdk-darwin-arm64`, user-agent `claude-cli/2.1.195`), but the
> binary assembles the system prompt and inline tool set BY ENTRY MODE and no
> SDK option switches it: SDK transport (`sdk-ts`, claude_code presets) ->
> SDK identity + 9 inline tools (~9.4k tok); `-p` print mode -> SDK identity +
> 26 tools; interactive TTY (pty) -> "You are Claude Code, Anthropic's official
> CLI for Claude." + 29-30 tools (~23k tok) + the agents system message. The
> user's live `/context` shows System prompt 4.1k tok = the 1.5k vendor-default
> base + environment-dependent sections (gitStatus, language, settings).
> Verified empirically against a local stub with both our provider binary
> (2.1.195) and the user's global CLI (2.1.199); the reference project
> (CodeAI-Hub `Claude_Module`) uses the same SDK path and never had a CLI-true
> native reference. User goal frame (2026-07-03): Native = the provider's
> ORIGINAL CLI wrapping (system prompt + system tooling + service messages);
> the Agent SDK / Codex app-server remain the control channel because they let
> us change everything, but the base stays the vendor client; derived profiles
> are built by editing the Native base (dropping only universal ballast). The
> proven capture method: run the provider binary in a real pty (python3
> `pty.fork` helper; `script(1)` fails with piped stdin, `expect` blocks
> without active pty drain), type the probe, submit, self-terminate on a timer
> (the orchestrator never kills the provider process — the race winner is the
> proxy capture). Production run: provider-home auth env (`HOME` -> provider
> home with OAuth state, `CLAUDE_USE_CLI_AUTH`) + our forward proxy
> (`HTTPS_PROXY` + `NODE_EXTRA_CA_CERTS`) + a trust-dialog pre-acceptance for
> the probe workspace in the provider-home `.claude.json`.

### Stream: Interactive Pty Capture

92. [DONE] `harness-ai.phase6c.stream1.task27` Capture the interactive Claude CLI native request instead of the SDK-assembled one: add `claude-interactive-cli-runner.ts` (diagnostics/) that resolves the system `python3` (clear preflight error when missing), pre-accepts the workspace trust dialog in the provider-home `.claude.json`, launches the provider claude binary in a real pty via an inline python `pty.fork` driver (boot wait -> type probe -> submit -> drain -> self-terminate), and switch `claude-native-request-capture-service.ts` from `sdkModule.query` to this runner (keep auth/proxy/certificate env wiring and the applied-input-envelope record, now describing the interactive run), with a unit test for the runner's pure helpers (trust upsert, python argv build), and raise the capture timeout for the Claude command in the Core capture RPC (the interactive pty cycle — binary boot, probe typing, submit — does not fit the 30s proxy default) (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/diagnostics/claude-interactive-cli-runner.ts` (new), `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/diagnostics/claude-native-request-capture-service.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/diagnostics/claude-interactive-cli-runner.test.mjs` (new), plus claude-provider `module.md`, core-runtime-process `module.md`, `docs/architecture/SessionProfilesV2.md` (decision 5: interactive CLI is the Native reference; Native-base goal frame) and `.harness/plans/todo-plan.md`; expected commit: `feat(claude-provider): capture interactive cli native request`) Result: Completed in commit `feat(claude-provider): capture interactive cli native request`.
93. [DONE] Git Commit: `feat(claude-provider): capture interactive cli native request` (hash: self)
94. [DONE] `harness-ai.phase6c.stream1.task28` Package the app with the interactive Claude CLI capture for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-interactive-cli.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with interactive cli capture`) Result: Completed in commit `chore(package): rebuild packaged app with interactive cli capture`.
95. [DONE] Git Commit: `chore(package): rebuild packaged app with interactive cli capture` (hash: self)
## Phase 6.7 - Kimi Native Capture Via Reverse Bridge (owner: Codex + User, updated: 2026-07-03)

> Discovery (2026-07-03, Kimi capture audit): the Kimi `captureNativeRequest`
> is a stub — it records only PATHS (a `wire.jsonl` that nothing ever writes;
> the provider home contains no such file) and the orchestrator's
> `captureWireOnly` branch then completes the run as `captured` with zero
> payload — a fake success. "Wire" is our ACP JSON-RPC leg (client<->agent),
> which by definition carries NO native system prompt / tool schemas — those
> only exist in the kimi binary's HTTPS request to the LLM endpoint. The
> orchestrator's Kimi rule is also stale: `api.moonshot.ai` +
> `/v1/chat/completions`, while the real endpoint (user config.toml,
> kimi-code 0.18.0) is `api.kimi.com` + `/coding/v1/chat/completions`. LIVE
> finding flagged for Phase R: our live Kimi sessions run `kimi acp` with the
> `codeai-managed-agent` whose system.md is the CODEX prompt from the
> reference project (`CODEX_NATIVE_SYSTEM_INSTRUCTIONS` + CodeAI addendum,
> 7 tools) — the vendor base is nowhere in the live path, contradicting the
> Native-base goal frame. Empirical matrix (local base_url stub on a cloned
> `.kimi-code` home, zero tokens): interactive TTY, `-p` print and
> `kimi acp` with the DEFAULT agent all send the IDENTICAL native wrapping —
> system "You are Kimi Code CLI..." 14755 chars (~3.7k tok) + 23 native tools
> (~14.5k tok: Agent, AgentSwarm, AskUserQuestion, Bash, CreateGoal, Cron*,
> Edit, EnterPlanMode/ExitPlanMode, FetchURL, Glob, Grep, Read, Skill, Task*,
> TodoList, WebSearch, Write); print only adds an auto-permission
> system-reminder; ACP == interactive byte-for-byte after timestamp
> normalization. So no pty is needed — the ACP channel with the default agent
> IS the native wrapping. BUT the kimi Mach-O binary IGNORES proxy env
> (HTTP(S)_PROXY/ALL_PROXY to a dead port still hit the stub; `NODE_USE_ENV_PROXY`
> ignored too), so the user-chosen variant B (request reaches the vendor
> through our transit) is implemented as a local REVERSE-FORWARD BRIDGE: a
> 127.0.0.1 HTTP listener that records the matched request and forwards it 1:1
> to the real upstream (`api.kimi.com`, TLS), relaying the response; the kimi
> capture process gets a TEMP CLONE of the user's `~/.kimi-code` (config.toml
> base_url pointed at the bridge keeping the original path, plus credentials/
> device_id) so the live config is never mutated. Note (plan structure): the
> bridge file and its orchestrator consumer ship in ONE commit because the
> knip gate rejects a new source file with no importer; the plan therefore
> pairs them in task29 rather than as two commits. Diagnostic scripts:
> `diag-kimi-acp.mjs` (minimal ACP client: initialize -> session/new ->
> session/prompt) plus the shared stub/pty scripts in the session scratchpad.

### Stream: Reverse Bridge And ACP Capture

96. [DONE] `harness-ai.phase6d.stream1.task29` Add the reverse-forward bridge and wire the Kimi orchestration onto it in one commit (bridge + consumer together to satisfy the knip no-unused-file gate; plan explicitly allows the >3-file scope): new `capture-proxy-reverse.ts` (`NativeCaptureReverseBridge` — 127.0.0.1 HTTP listener that buffers each request, forwards it 1:1 to the TLS upstream with only the Host header rewritten, relays the response, and resolves `waitForCapture()` on the first `pathIncludes`+`bodyIncludes` match; reuses the facade's exported `resolveRuleMismatch` and the HTTP reader), and in the orchestrator drop `captureWireOnly`/`KIMI_WIRE_PROXY_URL`, route `providerId === "kimi"` through a `#captureViaReverse` path (upstream `api.kimi.com`, null certificate fields, bridge base URL passed as the context `proxyUrl`) and fix the stale Kimi target rule to `api.kimi.com` + `/chat/completions` + `bodyIncludes` probe; unit tests for both (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-reverse.ts` (new), `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator.test.mjs`, plus capture-proxy `module.md`, capture-orchestrator `module.md`, the cluster `cluster.md` and `docs/architecture/SessionProfilesV2.md`; expected commit: `feat(provider-network-capture): kimi native capture via reverse bridge`) Result: Completed in commit `feat(provider-network-capture): kimi native capture via reverse bridge`.
97. [DONE] Git Commit: `feat(provider-network-capture): kimi native capture via reverse bridge` (hash: self)
98. [DONE] `harness-ai.phase6d.stream1.task30` Implement the real Kimi native capture in the adapter (plan explicitly splits this beyond 3 files): new `kimi-native-request-capture-service.ts` that clones the user's `~/.kimi-code` (config.toml + credentials + device_id) into a temp home, rewrites every `[providers.*]` `base_url` to the bridge URL preserving the original URL path (pure helper `kimi-capture-config-rewrite.ts`, unit-tested in isolation so knip sees a static consumer), spawns a temporary `kimi acp` process with the DEFAULT agent (no managed profile) via `KimiWireProcessBridge`/`KimiWireRouter`, runs initialize -> session/new (workspace cwd) -> optional session/set_config_option(model) -> session/prompt(probe), then stops the process and removes the temp clone; extend `KimiNativeRequestCaptureOptions` to the shared capture contract (probePrompt/proxyUrl/certificate fields) and switch the adapter's `captureNativeRequest` to the service with an envelope describing the ACP-default-agent reverse run (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/reference/diagnostics/kimi-native-request-capture-service.ts` (new), `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/reference/diagnostics/kimi-capture-config-rewrite.ts` (new), `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/reference/diagnostics/kimi-capture-config-rewrite.test.mjs` (new), `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/reference/provider/kimi-provider-adapter.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/reference/provider/kimi-provider-types.ts`, plus kimi-provider `module.md` and `docs/architecture/SessionProfilesV2.md` (decision 5 Kimi channel + live managed-agent finding); expected commit: `feat(kimi-provider): capture native request via acp default agent`) Result: Completed in commit `feat(kimi-provider): capture native request via acp default agent`.
99. [DONE] Git Commit: `feat(kimi-provider): capture native request via acp default agent` (hash: self)
100. [DONE] `harness-ai.phase6d.stream1.task31` Package the app with the Kimi reverse-bridge capture for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-kimi-reverse.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with kimi reverse capture`) Result: Completed in commit `chore(package): rebuild packaged app with kimi reverse capture`.
101. [DONE] Git Commit: `chore(package): rebuild packaged app with kimi reverse capture` (hash: self)
## Phase 6.8 - Kimi/Codex Capture Extraction Fixes (owner: Codex + User, updated: 2026-07-03)

> Discovery (2026-07-03, user re-capture of all three pairs on the 18:26
> build): Claude pair is correct (cli identity, 10 inline tools + deferred
> catalog, probe). Two defects remain. (1) KIMI: the capture WORKED (Summary
> `POST api.kimi.com:443/coding/v1/chat/completions`, JSONL body has system
> "You are Kimi Code CLI..." ~6.8k tok + 23 native tools + probe), but the
> markdown `## Extracted System Prompt` renders `null` — the section extractor
> only reads top-level `body.system`/`instructions`, while Kimi (OpenAI shape)
> puts the system prompt in `messages[role=system]`. Payload intact in JSONL;
> only the readable markdown loses the system section. (2) CODEX: regressed to
> the prewarm frame — the captured WS `response.create` is the background
> `memory_consolidation` turn (model `gpt-5.4-mini`, system "Memory Writing
> Agent", `tools: []`), NOT the probe turn (`gpt-5.5`, 17 tools). Root cause:
> memory-consolidation consolidates OUR probe session, so the probe prompt
> leaked into its `input`, and the `bodyIncludes: probe` WS filter matched the
> prewarm frame (which arrived first). The true Codex system prompt still
> lands via the rollout `base_instructions` (~5.4k tok), but tool schemas are
> missing. Discriminator: the probe turn carries non-empty top-level `tools`
> (17) while the memory-consolidation frame has `tools: []`, so requiring a
> minimum tool count on the WS frame selects our turn even when both contain
> the probe text.

### Stream: Extraction Correctness

102. [DONE] `harness-ai.phase6e.stream1.task33` Extract the Kimi system prompt from the chat messages: in `extractCaptureSections`, when the body has no top-level `system`/`instructions` but has a `messages` array, take the first `role: "system"` message's `content` as the system section (Anthropic/Codex shapes unchanged); the messages section still renders the full array. Unit test covers the OpenAI/Kimi shape (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/module.md`; expected commit: `fix(capture-artifacts): extract kimi system message`) Result: Completed in commit `fix(capture-artifacts): extract kimi system message`.
103. [DONE] Git Commit: `fix(capture-artifacts): extract kimi system message` (hash: self)
104. [DONE] `harness-ai.phase6e.stream1.task34` Select the Codex probe frame by tool count, not just probe text (plan explicitly allows the >3-file scope — one filter threaded from the rule to the WS capture): add an optional `minimumTools` to `runWebSocketCapture` that skips a `response.create` frame whose top-level `tools` array is shorter than the threshold (the `memory_consolidation` prewarm has `tools: []`, the probe turn has 17), thread `rule.minimumToolCount` into it from `forwardAndInspect`/`inspectClientRequest`, and set `minimumToolCount: 1` on the Codex default target rule; unit test decodes a prewarm frame that CONTAINS the probe text but has empty tools plus a probe frame with tools, and asserts the probe frame is captured (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-ws.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-proxy/src/capture-proxy.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator.test.mjs`, plus capture-proxy `module.md`, capture-orchestrator `module.md` and `docs/architecture/SessionProfilesV2.md`; expected commit: `fix(capture-proxy): select codex probe frame by tool count`) Result: Completed in commit `fix(capture-proxy): select codex probe frame by tool count`.
105. [DONE] Git Commit: `fix(capture-proxy): select codex probe frame by tool count` (hash: self)
106. [DONE] `harness-ai.phase6e.stream1.task35` Package the app with the Kimi/Codex capture extraction fixes for user re-capture (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/provider-network-capture-package-2026-07-03-extraction-fixes.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with capture extraction fixes`) Result: Completed in commit `chore(package): rebuild packaged app with capture extraction fixes`.
107. [DONE] Git Commit: `chore(package): rebuild packaged app with capture extraction fixes` (hash: self)
108. [DONE] `harness-ai.phase6.stream1.task2` User captures at least three native pairs (Claude, Codex, Kimi) in the packaged app via the Native Request Capture card and confirms each `.md`/`.jsonl` artifact contains the vendor-default system prompt and tool schemas; these pairs are the input to Phase R (scope: user workflow; expected commit: none). Result: Accepted 2026-07-03 — all three re-captured on the 18:47 build (dumps 17-02-50 claude-opus cli 10 inline tools, 17-03-16 codex gpt-5.5 17 tools, 17-03-26 kimi 23 tools), each with the native system prompt + tool schemas + probe and redacted credentials; verified correct.

## Phase 7 - Native Profile Unification (owner: Codex + User, updated: 2026-07-03)

> STATUS (2026-07-03): the items below are PROPOSALS UNDER DISCUSSION, NOT
> accepted decisions. The user has explicitly NOT signed off yet. Phase 7
> implementation (profile store, button, per-adapter application, Kimi bridge)
> MUST NOT start until each proposal is discussed and accepted — the first
> Phase 7 step is a discussion gate (task38), and this note is rewritten to
> record which items the user accepts as they are settled.
>
> What the user HAS confirmed so far (direction, not mechanism): (a) the goal —
> for ALL THREE providers the Native (and any custom) profile should send a
> system prompt + tooling that is OUR managed snapshot, frozen from a tested
> vendor version so later SDK/CLI updates do not change it; (b) fix Kimi FIRST;
> (c) the live per-session CONTEXT is generated dynamically every session and
> is NOT part of the frozen static wrapper. Everything below is HOW to deliver
> that and is still open.
>
> Proposals under discussion (each needs explicit user sign-off):
> - **B2 (static wrapper frozen, live context):** the system prompt splits into
>   (1) the static WRAPPER — identity, behavior rules, tool list; the part the
>   vendor changes on updates — which we freeze into the profile, and (2) the
>   live per-session CONTEXT — working dir, date, git status, memory/scratchpad
>   paths — which is generated fresh every session for EVERY profile (native
>   and managed alike), never stored in the profile. Freezing the context would
>   put a stale workspace/date into every session (a bug), so only the wrapper
>   is frozen.
> - **Unify via the Profiles folder:** Native becomes ordinary profiles under
>   `~/.harness-ai/Profiles/native-<provider>/` (profile.yaml + system-prompt.md
>   wrapper + tooling.yaml), read through the same path as managed profiles.
> - **"Update Native Profile" button** in Settings -> General next to the
>   Native Request Capture card: a Core command that takes the latest dump per
>   provider, splits wrapper/context, and rewrites the native profile files.
> - **Per-provider application ceilings (honest):** Claude — full prompt+tools
>   control (`systemPrompt` string/array + `tools` list). Codex — prompt via
>   `baseInstructions`, but tooling is app-server process-flags (17 tools fixed,
>   no per-thread trim). Kimi — NO native channel to replace the main system
>   prompt (proven 2026-07-03, see the rewriting-bridge note below); the only
>   proven way is to rewrite the outbound HTTP request on our proxy.
> - **Ballast candidate:** the Claude `# Memory` section (~2.2k tok, auto-memory
>   instructions + path) is a candidate to DROP from the wrapper — with our
>   orchestrated harness (plan as recovery owner, a commit per microtask) the
>   file-based auto-memory is redundant, so it is "on-all-occasions" ballast
>   rather than a load-bearing block. Decided per-section during authoring.

### Stream: Architecture Documentation

109. [DONE] `harness-ai.phase7.stream1.task36` Document the native prompt anatomy and composition: add `docs/architecture/NativePromptComposition.md` describing how a provider request is assembled (system prompt + tools + messages), the two system-prompt layers (static cacheable wrapper vs live per-session context), prompt caching (the static prefix is cached within one session so later turns are cheaper; the dynamic suffix is not), the per-provider breakdown from the accepted dumps (Claude 4 blocks incl. cli identity + Environment ~1k / Memory ~2.2k / Scratchpad dynamic; Codex; Kimi OpenAI shape), the B2 native model (frozen wrapper from the Profiles folder + live context generator shared by all profiles), the ballast decision on the Claude Memory section, and the per-provider application ceilings; register it in the index and cross-link from SessionProfilesV2 decision 5 (scope: `docs/architecture/NativePromptComposition.md` (new), `docs/DOCUMENTATION_INDEX.md`, `docs/architecture/SessionProfilesV2.md`; expected commit: `docs(architecture): document native prompt composition and caching`) Result: Completed in commit `docs(architecture): document native prompt composition and caching`.
110. [DONE] Git Commit: `docs(architecture): document native prompt composition and caching` (hash: self)

### Stream: Kimi Channel Research (DONE) And The Rewriting-Bridge Proposal (OPEN FOR DISCUSSION)

> KIMI CHANNEL RESEARCH RESULT (2026-07-03, read-only, user-directed "fix Kimi
> first"). Zero-context recovery: this note + `docs/architecture/
> NativePromptComposition.md` + the memory `native-profile-unification.md`
> fully restore the discussion; the diagnostic scripts lived in the session
> scratchpad (gone next session), so the method is described here in full.
>
> **Finding — kimi-code 0.18.0 has NO supported channel to replace the MAIN
> system prompt + tools.** Evidence: (1) the agent profiles agent/coder/
> explore/plan are BAKED INTO THE BINARY from bundle sources
> (`profile/default/*.yaml`, loaded via `loadAgentProfilesFromSources(paths,
> PROFILE_SOURCES)` where PROFILE_SOURCES is the in-binary content registry);
> (2) `config.profileName` only selects among those built-ins; (3)
> `discoverAgentsFromDisk(sessionDir)` populates SUBagents (the Agent tool),
> not the main prompt; (4) empirically a marker agent planted in
> `<home>/.kimi-code/agents/<name>.yaml` (both `name.yaml` and
> `name/agent.yaml`, inline `systemPrompt:` form) with ACP `session/new`
> passing `agent`/`agentName` did NOT reach the model — all 27 requests kept
> the default `You are Kimi Code CLI` + 23 native tools. This is exactly why
> the CodeAI-Hub managed `agent.yaml` never bound (2026-07-02 "not proven").
>
> **Proven solution — rewrite the outbound HTTP request on our proxy.** kimi
> posts an OpenAI-shape `POST /coding/v1/chat/completions` to the provider
> `base_url` in `config.toml`; we already route that base_url through our
> reverse bridge (the Kimi capture path, `capture-proxy-reverse.ts`). A
> REWRITING bridge parses the JSON body, replaces `messages[role=system]`
> with our synthetic wrapper and `body.tools` with our tool list, then forwards
> the rewritten request to the real `api.kimi.com` and relays the response.
> PROVEN empirically (zero tokens, terminal stub instead of the vendor): with
> kimi on the DEFAULT agent, the model side received system
> `"SYNTHETIC_NATIVE_KIMI_WRAPPER_7c1e ..."` and tools `["HarnessSyntheticTool"]`
> — OUR values, not the native 23. So a managed/native synthetic wrapper for
> Kimi is achievable regardless of kimi's lack of a substitution channel.
>
> **PROPOSAL (open for discussion next session):** run live Kimi sessions
> through a PERSISTENT rewriting bridge (not just diagnostic capture). The
> bridge applies the selected profile (native or managed) by substituting
> system + tools in every `/chat/completions` on the way to api.kimi.com; the
> live per-session context (Working Environment / date / AGENTS.md / Skills)
> is left as kimi builds it, or is itself rewritten — TBD. This is the SAME
> mechanism as capture, extended from record-only to record-and-rewrite.
>
> **Open questions to settle before planning implementation:**
> - Architecture home: does the persistent bridge live in the
>   `provider-network-capture` cluster (reuse `capture-proxy-reverse.ts`) or a
>   new live-transport module? Capture is diagnostic; a live rewrite path is
>   product runtime — likely a sibling module, not the diagnostic one.
> - Streaming: live responses are SSE/streamed; the bridge must relay the
>   vendor stream faithfully (capture only needed the request, not a clean
>   streamed response). This is the main new engineering vs capture.
> - TLS/trust and lifecycle: the bridge terminates the kimi->bridge hop
>   (plain http to 127.0.0.1) and opens its own TLS to api.kimi.com; it must
>   start/stop with the Kimi session and survive reconnects.
> - Wrapper vs context split on the wire: we replace `system` wholesale — do we
>   inject only the frozen wrapper (and let kimi's own context stay), or also
>   rebuild the live context? Ties back to the B2 model.
> - Alternative to weigh: DON'T rewrite Kimi — keep Kimi native on its real
>   built-in wrapper (it is already the vendor default) and apply synthetic
>   profiles only to Claude/Codex. Trade-off: loses "all three managed by us"
>   uniformity (user's C requirement) but avoids a persistent live proxy.
> - Failure mode: if the bridge is down, does the Kimi session fail closed
>   (no unmanaged fallback) or fall back to native? Fail-closed keeps the
>   managed guarantee honest.

111. [DONE] `harness-ai.phase7.stream1.task37` Record the Kimi channel research result and the rewriting-bridge proposal as an open discussion item in the plan (this stream + the updated per-provider ceiling line), so a zero-context next session fully restores the discussion; no code, plan-only (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): record kimi rewriting-bridge proposal for discussion`) Result: Completed in commit `docs(plan): record kimi rewriting-bridge proposal for discussion`.
112. [DONE] Git Commit: `docs(plan): record kimi rewriting-bridge proposal for discussion` (hash: self)

### Stream: Proposal Discussion Gate (blocks all Phase 7 implementation)

> Git Commit: `docs(plan): reframe phase 7 items as proposals with a discussion gate` (hash: self) — the reframe that OPENED this gate; task38 itself stays IN_PROGRESS across the discussion and is not advanced by this commit.

113. [IN_PROGRESS] `harness-ai.phase7.stream2.task38` Discuss the Phase 7 proposals with the user and get explicit per-item sign-off BEFORE any implementation. Items to settle (all currently PROPOSED, not accepted): (1) B2 wrapper/context split as the native model; (2) storing native as ordinary profiles under `~/.harness-ai/Profiles/native-<provider>/` read via the same parser as managed; (3) the "Update Native Profile" button (dump -> wrapper/context splitter -> profile files); (4) the Kimi rewriting-bridge proposal (persistent record-and-rewrite proxy for live Kimi) INCLUDING its open questions — bridge home, streaming relay, TLS/lifecycle, wrapper-vs-context on the wire, the "don't rewrite Kimi" alternative, fail-closed behavior; (5) per-provider ceilings (Claude full, Codex prompt-only tooling, Kimi via bridge); (6) the ballast decision to drop the Claude `# Memory` section. As each item is accepted or changed, rewrite the Phase 7 discovery note to record the decision; only AFTER sign-off expand the implementation microtasks (Kimi first, per user order). This task stays open across the discussion; it is a gate, not a code change (scope: discussion + plan note updates as decisions land; expected commit: none until a decision changes the note, then `docs(plan): record phase 7 decisions`).

## Phase R - Prompt Research (deferred, owner: Codex + User, updated: 2026-07-02)

> Discussed and expanded into microtasks ONLY after Phase 6 delivers the three
> native pairs. Methodology (representative tasks, quality criteria,
> multi-profile vs layered prompt vs per-provider tuning) is decided with the
> user then. See `docs/architecture/SessionProfilesV2.md` roadmap Phases R and
> 7-10 (profile-store v2, tool-inventory, tooling application, Profile
> Creator), which stay as roadmap until Phase R closes the open questions.
