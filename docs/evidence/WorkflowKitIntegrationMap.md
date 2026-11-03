# Workflow Kit — карта точек интеграции Harness

Статус: evidence scope `workflow-kit-2026-11-03` от 2026-11-03. Ниже — снимок
фактов о коде Harness на момент планирования: файлы и строки, через которые
Workflow Kit подключается к сборке, Core, Electron host, провайдерам и
интерфейсу. Номера строк со временем сдвигаются. Перед правкой сверяйтесь с
кодом.

## Build/test
- tsc runtime: tsconfig.runtime.json includes core-runtime/**, provider-runtime/** -> dist/runtime mirror. build = typecheck && build:runtime && vite build. dev: scripts/dev-electron.mjs runs build:runtime.
- No esbuild/tsx. vite 8 (rolldown transitive). Bundle via second vite config SSR lib -> dist/workflow-kit/workflow.mjs.
- Tests: scripts/test.mjs runs every *.test.mjs under scripts & product-parts via `node file`, stops at first failure. Pattern: ts.transpileModule each .ts into mkdtemp(.harness/runtime/<name>-test-) keeping layout, import facade via pathToFileURL (see profile-catalog.test.mjs:9-24,84-134). node:assert/strict, top-level code.
- knip.json entry includes product-parts/**/src/*-facade.{ts,tsx,mjs,cjs}, scripts/*.mjs, *.test.mjs. Non-facade entry (cli) must be added to knip.json entry. Unused exports fail knip.
- check-architecture: product-tree.json modules need module.md + src; MAX_LINES 500 for .mjs/.js/.ts/.tsx (tests too); electron-host may not contain 'core-runtime/clusters/' or 'provider-runtime/'.
- tsconfig: ES2022, NodeNext, strict, lib DOM included, relative imports end with .js. No const enum.
- Facade style: class + singleton e.g. `export class WorkspaceRegistryFacade` + `export const workspaceRegistryFacade = new ...`.
## Packaging
- package.json build (L69-94): asar true, files: dist/renderer/**, dist/runtime/**, electron-host modules src, package.json. No extraResources. Add extraResources {from: dist/workflow-kit, to: workflow-kit}.
- Core spawned by core-process-supervisor.mjs:19-22,36-44 with process.execPath + ELECTRON_RUN_AS_NODE=1; repositoryRoot from app-bootstrap-facade.mjs:7-8. Pass env HARNESS_WORKFLOW_KIT_BUNDLE (path) to core (supervisor L38-43).
## RPC / UI
- Add workspace: sidebar L285-294 -> session-window-facade.tsx addWorkspace L333-350 -> preload pickWorkspaceFolder L103 -> bridge L72-81 dialog + rpc add-workspace -> core-runtime-api.ts invoke switch L101-212, addWorkspace L227-237 (482 lines! ~18 free) -> registry; startWorkspaceProvisioning L425-433.
- New RPC: new core-*-rpc.ts in core-runtime-process/src (pattern core-session-profile-rpc.ts), case lines in invoke; host IPC_TO_RPC map bridge L4-51 (generic handlers L66-70); preload harnessCore method; vite-env.d.ts Window.harnessCore L52-328 typings; events via CoreRuntimeApi.subscribe L82-99 & onEvent union L214-220 + guard in session-window-core-events.ts. Tests regex-match bridge map & core-runtime-api source.
- session-window-facade.tsx 496 lines (FULL) -> extract workspace hook first. sidebar 409. settings-surface-facade 488, settings-tab-content 480 (full). session-surface-facade 91.
- Modal pattern: provider-picker-backdrop/provider-picker-card (provider-picker.tsx). Rename dialog pattern in sidebar L358-406.
- Localization: source-dictionaries.ts (324 lines) ui_labels / ui_helper_text / messages_for_the_user; t(category,key,fallback) via useBrowserLocalization.
- Registry persisted ~/.harness-ai/workspaces.json.
## Providers / sessions
- Claude: claude-sdk-manager.ts:249-307 buildQueryOptions per turn; systemPrompt from claude-workspace-system-prompt.ts (legacy), claude-profile-application.ts: native(96-105) preset claude_code settingSources user/project/local; managed(107-128) prompt replace, [] ; legacy early return L94.
- Contract provider-adapter-contract-facade.ts: SessionProfilePayload 92-101; ProviderSessionStartOptions 103-112 {profile?,profileKind?}.
- Codex: codex-app-server-facade.ts createSession 183-221 thread/start, resumeSession 223-251, sendMessage 272-332; buildCodexThreadProfileParams codex-profile-application.ts:35-42 -> developerInstructions slot unused. env in codex-provider-facade.ts:19-38, process codex-app-server-process.ts:260-282.
- Universal client: openrouter-client-provider-facade.ts:117-126,185-194 messages:[]; glm 89-95; local-models 135-141; kimi-client managed system message kimi-managed-profile-application.ts:24-29.
- Core: session-provider-binding-lifecycle.ts:68-127 bindProviderSession (startOptions 83-86, create/resume 87-94); dispatchProviderMessage 129-150. session-request-handler-facade.ts sendMessage 187-218. session-provider-event-router.ts:60-131 routeProviderEvent, turn_completed 115-119, turn_failed 120-123, stream_error 124-130; first branch L68 profileCreatorResultHandler (profile-creator-result-handler.ts:124-166 rejectAndRepair pattern, repairPendingSessions). stop: session-turn-stop.ts:32-48. Events session-event-stream-facade.ts publish 135-150.
