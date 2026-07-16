# Kimi Native Capture Module

## Responsibility

Own the diagnostic-only driver for capturing the original Kimi Code CLI
request. Kimi production sessions remain on `kimi-client-provider` and the
Core universal client; this module does not implement or register a session
provider.

For one capture it clones only the user's native `config.toml`, credentials,
device id and TUI settings into a temporary HOME, rewrites provider base URLs
to the Core reverse-forward bridge, materializes the selected Coding Plan
model as a temporary native CLI alias when needed, and drives `kimi acp` with
the default Kimi agent through `initialize` -> `session/new` -> model selection
-> one diagnostic `session/prompt`. The temporary HOME is always deleted and
native logs/session history are never copied.

## Public Facade

`src/kimi-native-capture-facade.ts` exports `KimiNativeCaptureFacade` and the
singleton `kimiNativeCaptureFacade` with `captureNativeRequest(options)`.

## Inputs

- Core-owned `ProviderNativeCaptureOptions`: capture id, selected model id,
  workspace path, diagnostic probe prompt, reverse-bridge URL, and artifact
  callbacks.
- The installed native CLI at `~/.kimi-code/bin/kimi` (falling back to PATH)
  and the user's real `~/.kimi-code` config/auth source.

## Outputs

- One original native CLI request sent through the reverse-forward bridge.
- Applied-envelope evidence identifying `kind: kimi`,
  `mode: acp_default_agent`, bridge URL, source config directory and selected
  model.
- Bounded CLI version/process diagnostics; no credential contents are copied
  into diagnostics.

## Owned Paths

- `module.md`
- `src/**`
