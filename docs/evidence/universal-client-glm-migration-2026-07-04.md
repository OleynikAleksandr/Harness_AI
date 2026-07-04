# Universal Client GLM Migration Evidence - 2026-07-04

## Verdict

**PASSED / ACCEPTED.** The user ran the packaged GLM app after the Phase 3
migration and accepted the result on 2026-07-04:

- First packaged run: "all works" for the new GLM universal-client behavior,
  with one residual Settings defect in the visible GLM tab.
- Follow-up packaged run after `fix(settings-ui): remove legacy glm native
  settings block`: "Все работает можно фазу закрывать".

This closes Phase 3 GLM migration acceptance for the current scope.

## Accepted Product Behavior

- The visible GLM provider is the Core universal-client endpoint
  (`glm-client`), not the retired embedded OpenCode runtime.
- GLM key onboarding is in the GLM Settings tab through the Z.ai Coding Plan
  API key card (`providers.glmClient.apiKey`).
- GLM model selection is the universal-client GLM catalog
  (`providers.glmClient.defaultModel`), not the old single native
  `glm-5.2` block.
- The old visible native Settings block is gone: no `GLM Connection` card and
  no separate single-row `glm-5.2` card below the universal-client controls.
- The OpenCode Settings tab/card is gone.
- No OpenCode entry appears in the provider picker.
- Existing-session continuity checks were intentionally dropped per the
  2026-07-04 user decision: the user kills all sessions on every update and
  does not need GLM/OpenCode legacy session preservation.

## Wire Facts (Core-owned, from the shipped code)

- Provider id: `glm-client`.
- Endpoint/base URL: `https://api.z.ai/api/coding/paas/v4`
  (`GLM_DIALECT.baseUrl`, `glm-client-provider-facade.ts`).
- Header: `Accept-Language: en-US,en`.
- Default model: `glm-5.2` unless changed through
  `providers.glmClient.defaultModel`.
- Auth: Z.ai Coding Plan API key resolved per turn from provider auth store
  (`glm-client`, settings section `providers.glmClient.apiKey`, with
  `GLM_API_KEY` / `ZAI_API_KEY` environment fallbacks).
- Thinking form: `reasoning_content`, normalized by the universal-client
  dialect streaming module onto the internal thinking channel.
- Extra body per turn:
  - `thinking: { type: "enabled" }`
  - `reasoning_effort: <providers.glmClient.reasoningEffort>`
  - `tool_stream: true`
- Tool choice support: `auto_only`.
- Usage is read from the final chunk (`usageFromAnyChunk: false`).

## Build Evidence

See `docs/evidence/universal-client-glm-package-2026-07-04.md`.

Accepted packaged artifact after the Settings cleanup:

- App: `release/mac-arm64/Harness AI.app`
- `app.asar`: rebuilt at `2026-07-04 22:24:28` (30284766 bytes)

## Consequences

- Phase 3 (GLM migration to the universal client) is complete.
- The embedded OpenCode runtime remains removed from production runtime:
  `glm-opencode` is no longer a provider id, `glm-opencode-provider/**` is
  deleted, and `@opencode-ai/sdk` is no longer a runtime dependency.
- `glm-native` remains internal/retired legacy runtime debt only; it is no
  longer presented as a visible Settings path.
- The active plan can move on to the Phase 4 milestone breakdown when the user
  wants to start Local Models / OpenRouter provider work.
