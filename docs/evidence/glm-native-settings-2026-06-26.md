# GLM Native Settings Verification - 2026-06-26

## Commands

- `npm run package:mac`
- `HARNESS_AI_HOME="$(mktemp -d)" node --input-type=module -e "<provider settings smoke>"`
- `grep -a "GLM Native" "release/mac-arm64/Harness AI.app/Contents/Resources/app.asar"`
- `grep -a "harness-ai:core:save-provider-system-settings" "release/mac-arm64/Harness AI.app/Contents/Resources/app.asar"`
- `node --input-type=module -e "<packaged startup smoke>"`

## Results

- Unsigned macOS app rebuilt at `release/mac-arm64/Harness AI.app`.
- GLM Native system settings write to `~/.harness-ai/providers/glm-native/settings.json`.
- Smoke used an isolated temporary `HARNESS_AI_HOME`, so no real provider secrets were read or changed.
- Auth store read back `apiKey`, `baseUrl`, and `defaultModel` from the system provider settings file.
- Packaged app contains the GLM Native settings UI and provider settings IPC bridge.
- Packaged startup smoke completed without bootstrap errors.

## Runtime Contract

- System provider settings path: `~/.harness-ai/providers/<providerId>/settings.json`.
- Workspace provider home path remains `<workspace>/.harness/runtime/providers/<providerId>/home`.
