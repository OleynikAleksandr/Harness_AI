# Codex Workspace Runtime Home App Verification - 2026-06-28

## Scope

Verified that the packaged Harness AI macOS app contains the Codex workspace
runtime-home binding fix.

## Commands

- `npm run plan:validate`
- `npm run package:mac`
- `npx asar extract "release/mac-arm64/Harness AI.app/Contents/Resources/app.asar" /tmp/harness-ai-asar-codex-home-check`
- `rg -n "\\.codeai-hub|environment: options\\.environment|prepareProviderCodexHome\\(processEnvironment\\)|CODEX_WORKSPACE_PATH|CODEX_HOME" /tmp/harness-ai-asar-codex-home-check/dist/runtime/product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src`

## Result

- `npm run package:mac` completed successfully.
- Packaged app exists at `release/mac-arm64/Harness AI.app`.
- `app.asar` timestamp: `2026-06-28 19:17:26`.
- Extracted packaged Codex runtime contains:
  - `environment: options.environment ?? {}`
  - `prepareProviderCodexHome(processEnvironment)`
  - `CODEX_WORKSPACE_PATH`
  - workspace-bound `CODEX_HOME`
- Extracted packaged Codex runtime contains no `.codeai-hub` path.

## User Retest Note

Quit any already running Harness AI instance before launching the rebuilt app.
Old Electron processes keep the previous `app.asar` code loaded.
