# CodexUC Detailed Reasoning Summary Package Evidence - 2026-07-07

## Scope

- Plan: `codex-uc-reasoning-effort-2026-07-07`
- Implementation commit: `51005b2b fix(codex-uc): request detailed reasoning summary`
- Package task: `harness-ai.phase6.stream1.task1`
- Packaged app: `release/mac-arm64/Harness AI.app`

## Change Packaged

CodexUC now normalizes live Responses requests to
`reasoning.summary: "detailed"` instead of `reasoning.summary: "concise"`.
The selected Core/Codex reasoning effort is still preserved in the same
`reasoning` object.

Live probes against `https://chatgpt.com/backend-api/codex/responses` confirmed
that the backend accepts both `summary: "detailed"` and `summary: "auto"` with
HTTP 200. `summary: "auto"` is returned in native feedback as
`summary: "detailed"`. `summary: "concise"` produced visible summary stream
events, but the visible text was too low-value for the CodexUC Thinking surface.

## Verification

- `node product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-provider.test.mjs`
  - Result: `codex-uc-provider tests passed`
- `npm run plan:validate`
  - Result: `Plan validation: OK`
- `npm run plan:commit -- "fix(codex-uc): request detailed reasoning summary"`
  - Result: commit `51005b2b`
  - Hook result: `Tests: OK (80)`
- `npm run build`
  - Result: completed successfully.
- `npm run package:mac`
  - Result: completed successfully.
  - The package script stopped stale packaged app processes before rebuilding:
    `38688`, `38689`, `38690`, `38691`, `38701`.
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
  - Timestamp: `Jul 7 20:13:23 2026`
- Packaged artifact inspection:
  - `strings release/mac-arm64/Harness AI.app/Contents/Resources/app.asar | rg 'summary: "detailed"'`
  - Result: packaged runtime contains the CodexUC `summary: "detailed"` request normalization.

## Retest Notes

For the next packaged-app CodexUC turn, inspect:

`~/.harness-ai/logs/providers/codex-uc-response-feedback.jsonl`

Expected backend feedback:

```json
{
  "reasoning": {
    "effort": "<selected effort>",
    "summary": "detailed"
  }
}
```

Visible `thinking` dialog messages may be absent if the backend continues to
accept `detailed` but does not stream `response.reasoning_summary_*` events for
that mode.
