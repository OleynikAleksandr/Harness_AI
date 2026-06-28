# Session Reasoning Display Evidence - 2026-06-28

Scope: port CodeAI-HUB-style visible reasoning display into Harness AI without copying reference modules.

Implemented:

- Added Core Runtime `session-reasoning-display` module with `SessionReasoningDisplayFacade`.
- The facade projects explicit `thinking` provider events, reasoning payload fields, and tagged visible reasoning blocks such as `<think>...</think>` into Core dialog messages.
- Wired `session-request-handler` to publish facade-projected messages through the existing `session:message` stream, so the existing Session Window thinking bubble renderer is reused.
- Ported the missing CodeAI-HUB Codex app-server parity: `turn/start` now requests `summary: "detailed"`, and Codex reasoning summary/text delta notifications are normalized into `thinking` dialog messages.
- Added a shared OpenAI-compatible fallback that emits final `reasoning_content` / `reasoning` response fields as `thinking` dialog messages before assistant text.
- Restored Codex applied reasoning settings: Core now passes Codex reasoning effort and summary enablement from Core-owned settings into provider turn options, and the Codex adapter sends `effort` plus enabled/disabled `summary` in `turn/start`.
- Fixed Codex provider-home summary materialization after user retest: the previous `model_reasoning_summary` line was appended after TOML tables and could be interpreted inside the last table instead of top-level config. Provider-home preparation now rewrites any existing summary line and inserts top-level `model_reasoning_summary = "detailed"` before the first TOML table, matching the CodeAI-HUB requirement that visible Codex reasoning comes from app-server reasoning summary notifications.
- Restored Kimi workspace/native-output parity for the current CLI path: Kimi now runs from the active workspace cwd and requests `--output-format stream-json`; the shared CLI adapter emits native thinking chunks as `thinking` dialog messages when Kimi includes them.
- Restored Claude workspace context by running Claude CLI sessions from the active workspace cwd so files such as `CLAUDE.md` are visible to the provider.
- Kept provider-specific protocol parsing out of the UI.

Storage facts:

- Harness Core dialog history is append-only JSONL under `<workspace>/.harness/sessions/events/<session-id>.jsonl`; the session index is `<workspace>/.harness/sessions/index.json`.
- Provider-native state lives under `<workspace>/.harness/runtime/providers/<providerId>/home` for workspace-bound sessions. Codex app-server may create SQLite files there; those are provider-native state, not Harness Core dialog history.

Verification commands:

- `npm run check:architecture`
- `npm run lint`
- `npm run check:knip`
- `npm run typecheck`
- `npm test`
- `npm run check:dup`
- `npm run check:security`
- `npm run check:links`
- `npm run build`
- `npm run package:mac`

Result:

- All commands completed successfully.
- `npm test` passed 17 tests.
- `check:architecture` reported 50 product-tree modules and no ownership errors.
- `check:security` reported 0 high vulnerabilities.
- `check:links` passed.
- `npm run package:mac` rebuilt `release/mac-arm64/Harness AI.app`.
- Known non-blocking output remained: Knip configuration hints, jscpd existing clone counts below configured thresholds, electron-builder default icon and unsigned app notices.

## Cross-Provider Reasoning Settings Parity Follow-Up

Reference files checked in CodeAI-Hub:

- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Claude_Module/src/sdk/claude-sdk-manager.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Claude_Module/src/provider/claude-applied-turn-config.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/GLM_Module/src/provider/glm-native-adapter-utils.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/GLM_OpenCode_Module/src/provider/glm-opencode-provider-adapter.ts`
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/client/project-manager/services/workflow-step-start-settings-defaults.ts`

Harness changes verified:

- Core now derives provider turn options from the Core settings snapshot for Codex, Claude, Kimi, GLM Native, GLM OpenCode, OpenRouter, Local Models, and fallback providers instead of applying settings only to Codex.
- Claude receives Core-owned `thinkingEnabled`, `reasoningEffort`, and `thinkingDisplaySyncEnabled` in provider turn options. Full CodeAI-Hub Claude SDK parity remains a separate larger migration because Harness still uses the existing CLI adapter.
- Kimi receives Core-owned `thinkingEnabled` and `thinkingDisplaySyncEnabled`; visible reasoning still depends on the provider emitting native thinking chunks in stream JSON.
- GLM Native receives Core-owned `thinkingEnabled` and `reasoningEffort`; the shared OpenAI-compatible helper maps these to GLM request fields `thinking` and `reasoning_effort`.
- GLM OpenCode and OpenRouter receive the same Core-owned model/endpoint selection shape as the reference settings flow, without adding UI-owned provider logic.
- Shared OpenAI-compatible adapters do not receive GLM-only request fields unless the adapter declares `providerId: "glm-native"`.

Verification commands for the follow-up:

- `node product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/provider-turn-options.test.mjs`
- `node product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/session-provider-adapter-helpers.test.mjs`
- `npm run typecheck`
- `npm test`
- `npm run plan:commit -- "fix: apply reasoning settings across providers"`
- `npm run check:dup`
- `npm run check:security`
- `npm run check:links`
- `npm run build`
- `npm run package:mac`
- `test -d "release/mac-arm64/Harness AI.app"`

Result:

- All follow-up commands completed successfully.
- `npm test` passed 20 tests.
- `check:security` reported 0 high vulnerabilities.
- `check:links` passed.
- `npm run package:mac` rebuilt `release/mac-arm64/Harness AI.app`.
- Known non-blocking output remained: Knip configuration hints, existing jscpd clone counts below failure threshold, electron-builder default icon and unsigned app notices.
