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
