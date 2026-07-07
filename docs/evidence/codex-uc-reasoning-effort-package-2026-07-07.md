# CodexUC Reasoning Effort Package Evidence - 2026-07-07

## Scope

- Commit: `a7a38ca4 fix(codex-uc): honor selected reasoning effort`.
- User-facing target: packaged `Harness AI.app` for CodexUC retest.
- Contract checked: CodexUC live Responses requests keep native-bundle static
  request template fields, but the Core-selected Codex reasoning effort for the
  session model overrides captured `request-template.json` `reasoning.effort`.
  CodexUC still normalizes outgoing `reasoning.summary` to `concise`.

## Verification

- `node product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-provider.test.mjs`
  - Result: OK, `codex-uc-provider tests passed`.
- `node product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/provider-turn-options.test.mjs`
  - Result: OK.
- `npm run plan:validate`
  - Result: OK.
- `npm run plan:commit -- "fix(codex-uc): honor selected reasoning effort"`
  - Result: commit succeeded; pre-commit ran `plan:validate`,
    `check:architecture`, `lint`, `check:knip`, `typecheck`, and `npm test`.
  - Full tests: OK (`Tests: OK (79)`).
- `npm run build`
  - Result: OK.
- `npm run package:mac`
  - Result: OK.
  - `package:stop-old` stopped packaged Harness AI app process `91064`.
  - `electron-builder` packaged `darwin arm64` into `release/mac-arm64`.

## Packaged Artifact Check

- Verified directory exists: `release/mac-arm64/Harness AI.app`.
- Verified bundled ASAR exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Verified bundled ASAR contains the updated CodexUC request merge:
  `templateReasoning || input.reasoningEffort` plus
  `input.reasoningEffort ? { effort: input.reasoningEffort } : {}`.
- Verified bundled ASAR still normalizes CodexUC summary with
  `return { ...reasoning, summary: "concise" }`.

## Retest Notes

- Restart the packaged app after this package build.
- In Codex settings, choose `gpt-5.5` and `x-High`.
- Start a CodexUC session using a Codex native-bundle profile.
- Expected outgoing CodexUC route behavior: request body carries
  `reasoning.effort: "xhigh"` and `reasoning.summary: "concise"` even though
  the profile sidecar `request-template.json` still records captured
  `reasoning.effort: "high"` / `summary: "detailed"`.
