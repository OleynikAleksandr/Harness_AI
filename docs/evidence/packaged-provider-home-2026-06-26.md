# Packaged Provider Home Verification - 2026-06-26

## Commands

- `npm run package:mac`
- `node --input-type=module -e "<provider-home smoke>"`
- `grep -a "request.workspacePath.*asar" "release/mac-arm64/Harness AI.app/Contents/Resources/app.asar"`
- `grep -a "workspaceRegistryFacade.getActiveWorkspace" "release/mac-arm64/Harness AI.app/Contents/Resources/app.asar"`
- `node --input-type=module -e "<packaged startup smoke>"`

## Results

- Unsigned macOS app rebuilt at `release/mac-arm64/Harness AI.app`.
- Provider home smoke rejected the packaged archive path and resolved fallback to `/Users/oleksandroliinyk/.harness-ai/providers/codex/home`.
- Provider home smoke resolved the active workspace path to `/Users/oleksandroliinyk/VSCODE/harness-ai/.harness/runtime/providers/codex/home`.
- Packaged `app.asar` contains the `.asar` guard in `ProviderHomeManagerFacade`.
- Packaged `app.asar` contains active workspace resolution through `workspaceRegistryFacade.getActiveWorkspace().path`.
- Packaged startup smoke did not emit the prior `ENOTDIR` provider-home error or an `app.asar/.harness` provider-home path.

## Nonblocking Output

- Chromium emitted `Failed to initialize the DIPS SQLite database.` during short startup smoke. This warning is not connected to provider home resolution.
