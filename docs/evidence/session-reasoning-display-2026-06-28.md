# Session Reasoning Display Evidence - 2026-06-28

Scope: port CodeAI-HUB-style visible reasoning display into Harness AI without copying reference modules.

Implemented:

- Added Core Runtime `session-reasoning-display` module with `SessionReasoningDisplayFacade`.
- The facade projects explicit `thinking` provider events, reasoning payload fields, and tagged visible reasoning blocks such as `<think>...</think>` into Core dialog messages.
- Wired `session-request-handler` to publish facade-projected messages through the existing `session:message` stream, so the existing Session Window thinking bubble renderer is reused.
- Ported the missing CodeAI-HUB Codex app-server parity: `turn/start` now requests `summary: "detailed"`, and Codex reasoning summary/text delta notifications are normalized into `thinking` dialog messages.
- Added a shared OpenAI-compatible fallback that emits final `reasoning_content` / `reasoning` response fields as `thinking` dialog messages before assistant text.
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
- `npm test` passed 14 tests.
- `check:architecture` reported 50 product-tree modules and no ownership errors.
- `check:security` reported 0 high vulnerabilities.
- `check:links` passed.
- `npm run package:mac` rebuilt `release/mac-arm64/Harness AI.app`.
- Known non-blocking output remained: Knip configuration hints, jscpd existing clone counts below configured thresholds, electron-builder default icon and unsigned app notices.
