# CodexUC Response Feedback Package Evidence - 2026-07-07

## Scope

- Commit: `533bb2f5 feat(codex-uc): record response reasoning feedback`.
- User-facing target: packaged `Harness AI.app` for CodexUC retest.
- Contract checked: CodexUC now records redacted response-side feedback so the
  user can distinguish requested reasoning effort from backend-returned
  reasoning metadata.

## Verification

- `node product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-provider.test.mjs`
  - Result: OK, `codex-uc-provider tests passed`.
- `node product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-response-feedback.test.mjs`
  - Result: OK, `codex-uc-response-feedback tests passed`.
- `npm run plan:commit -- "feat(codex-uc): record response reasoning feedback"`
  - Result: commit succeeded; pre-commit ran `plan:validate`,
    `check:architecture`, `lint`, `check:knip`, `typecheck`, and `npm test`.
  - Full tests: OK (`Tests: OK (80)`).
- `npm run build`
  - Result: OK.
- `npm run package:mac`
  - Result: OK.
  - `package:stop-old` stopped packaged Harness AI app process `20430`.
  - `electron-builder` packaged `darwin arm64` into `release/mac-arm64`.

## Packaged Artifact Check

- Verified directory exists: `release/mac-arm64/Harness AI.app`.
- Verified bundled ASAR exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Verified bundled ASAR contains `recordCodexUcResponseFeedback`.
- Verified bundled ASAR contains
  `codex-uc-response-feedback.jsonl`, `feedbackEvents`,
  `responseEventNames`, and extraction for `response.created` /
  `response.completed`.

## Retest Notes

- Restart the packaged app after this package build.
- Run a CodexUC turn with the Codex settings model/effort under test.
- Inspect:
  `~/.harness-ai/logs/providers/codex-uc-response-feedback.jsonl`.
- Each record is redacted. It includes requested `model`/`reasoning`, HTTP
  status, response event names, and sanitized backend `response.created` /
  `response.completed` model/status/reasoning metadata when present.
- If `requested.reasoning.effort` is `xhigh` but `feedbackEvents[].reasoning`
  is missing, the backend did not expose accepted reasoning metadata in the SSE
  feedback captured for that turn.
