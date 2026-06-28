# CodeAI Hub Provider Runtime Alignment

## Decision

Harness AI must follow the CodeAI Hub provider/runtime reference flow. The current direct `provider-turn-runner` path and the simplified provider wrappers are not valid foundations for MVP provider execution because they bypass the Core-owned and provider-owned layers that Harness AI needs for:

- session JSONL history and translation overlays;
- realtime thinking/reasoning translation;
- normalized provider event routing;
- model/reasoning binding from settings;
- provider home/auth materialization;
- stale binding recovery and stop/resume lifecycle;
- provider-native system prompt, tools, runtime profile, and process/session control;
- future intent normalization and orchestration envelopes.

The direct runner and wrapper-only provider adapters can remain only as historical implementation debt until replaced. New provider work must not extend them.

## Reference Flow

CodeAI Hub routes a session turn through these boundaries:

1. UI sends raw session action to the Core bridge.
2. Core `SessionRequestHandler` resolves or creates a Core session.
3. Core binds the session to a provider adapter using `createSession` or `resumeSession`.
4. Core persists visible user messages before dispatch.
5. Core attaches applied provider turn config from settings/session model binding.
6. Core dispatches to the provider adapter through the shared adapter contract.
7. Provider adapter owns the provider process or API integration.
8. Provider-specific events are normalized into provider-neutral session events.
9. Core persists assistant/thinking/system messages and translation overlays.
10. UI renders Core snapshots and stream events only.

## Harness AI Target Flow

Harness AI should use the same authority split:

```mermaid
flowchart LR
  UI["Application Shell / Session UI"]
  Bridge["Electron Core Bridge"]
  Core["Core Runtime / Session Request Handler"]
  Binding["Provider Session Binding"]
  Adapter["Provider Adapter Contract"]
  Provider["Provider App Server or Runtime API"]
  Events["Provider Event Normalizer"]
  Storage["JSONL History + Translation Overlay"]

  UI --> Bridge --> Core --> Binding --> Adapter --> Provider
  Provider --> Events --> Core --> Storage
  Core --> UI
```

Renderer and Electron host must not call provider CLIs or SDKs directly. They may only send UI intents to Core and render Core-owned snapshots/events.

## Module Direction

The next product-tree update should replace the role of `provider-turn-runner` with explicit modules:

- Core Runtime / Session Runtime:
  - `session-request-handler`
  - `provider-session-binding`
  - `session-event-stream`
  - `session-reasoning-display`
- Provider Runtime / Provider Adapters:
  - `provider-adapter-contract`
  - one adapter module per provider
- Provider Runtime / Provider Events And Translation:
  - `provider-event-normalizer`
  - `provider-translation-engines`
- Application Shell / Electron Host:
  - `core-process-bridge`

## Immediate Implementation Rule

From this scope forward, provider execution must enter through Core session dispatch. Any shortcut that calls a provider outside the CodeAI Hub-style Core/provider adapter path requires explicit user approval before implementation.

Visible provider reasoning follows the same rule: provider adapters request provider-native visible reasoning where the provider requires an explicit turn option, provider events enter Core, `session-reasoning-display` projects explicit thinking events or tagged visible reasoning into Core `thinking` messages, and the UI only renders the projected session messages. Provider-native persistence under isolated provider homes is separate from Harness Core dialog JSONL history under `<workspace>/.harness/sessions/**`.

Live assistant text follows the CodeAI Hub append-only contract: providers may emit assistant chunks tagged `live`; Core preserves that tag, coalesces consecutive live chunks for session readback/display, and suppresses or reduces a later full-text final answer when the live text already covers it. Renderer code must not infer provider chunk semantics without this Core/shared contract.

## Reference Module Migration Map

This migration is provider-by-provider. CodeAI Hub is the behavioral source of truth; Harness adaptation is limited to product-tree placement, facade boundaries, imports, focused tests, and Core contract integration.

### Claude

Reference source:

- `CodeAI-Hub/packages/Claude_Module/src/auth/**`
- `CodeAI-Hub/packages/Claude_Module/src/installer/**`
- `CodeAI-Hub/packages/Claude_Module/src/sdk/**`
- `CodeAI-Hub/packages/Claude_Module/src/session/**`
- `CodeAI-Hub/packages/Claude_Module/src/messaging/**`
- `CodeAI-Hub/packages/Claude_Module/src/provider/**`
- `CodeAI-Hub/packages/Claude_Module/src/types/**`

Harness target:

- `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/**`

Required behavior:

- Replace `claude --print` wrapper behavior with the Claude Agent SDK manager/session path.
- Preserve SDK query options for `cwd`, `projectPath`, `additionalDirectories`, `settingSources`, `systemPrompt`, `tools`, `model`, `effort`, `thinking`, `resume`, and structured output.
- Preserve thinking stream handling: content block start/delta/stop, thinking live buffer, text live buffer, final thinking reconciliation, and `dialog_message` emissions tagged as `thinking`.
- Preserve auth/home bridge, usage/context probes, stale binding handling, and runtime profile behavior.
- In the packaged macOS app, preserve reference installer behavior while augmenting the npm runner PATH for GUI launches so Homebrew npm can be found before Claude SDK setup.

### Codex

Reference source:

- `CodeAI-Hub/packages/Codex_AppServer_Module/src/app-server/**`
- `CodeAI-Hub/packages/Codex_AppServer_Module/src/app-server/process/**`
- `CodeAI-Hub/packages/Codex_AppServer_Module/src/provider/**`
- `CodeAI-Hub/packages/Codex_AppServer_Module/src/diagnostics/**`
- `CodeAI-Hub/packages/Codex_AppServer_Module/src/translation/**`
- `CodeAI-Hub/packages/Codex_AppServer_Module/src/types/**`

Harness target:

- `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/**`
- `product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/**`

Required behavior:

- Replace partial app-server logic with the reference process/facade/event-router stack.
- Preserve app-server process profile, provider home/auth normalization, base instructions/config, thread start/resume, stale binding handling, turn interrupt, and usage limit updates.
- Preserve reasoning behavior: summary params, summary stream buffer, live reasoning fallback buffer, item completion reconciliation, agent message delta buffering, and `thinking` tagged dialog messages.
- Preserve Codex capability and Spark summary gating from the reference module.

### Kimi

Reference source:

- `CodeAI-Hub/packages/Kimi_Module/src/wire/**`
- `CodeAI-Hub/packages/Kimi_Module/src/session/**`
- `CodeAI-Hub/packages/Kimi_Module/src/provider/**`
- `CodeAI-Hub/packages/Kimi_Module/src/messaging/**`
- `CodeAI-Hub/packages/Kimi_Module/src/types/**`

Harness target:

- `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/**`

Required behavior:

- Replace the generic CLI parser path with Kimi wire process/router, session lifecycle, managed profile, workspace override state, token/usage readers, and event normalizer.
- Preserve thinking handling from Kimi native events, including ACP and stream JSON shapes covered by reference tests.

### GLM Native

Reference source:

- `CodeAI-Hub/packages/GLM_Module/src/provider/**`

Harness target:

- `product-parts/provider-runtime/clusters/provider-adapters/modules/glm-native-provider/**`

Required behavior:

- Preserve native runtime profile, agent runtime instructions, expanded tools, file edit/patch executors, workspace tools, process/session log, SSE parser, stream reader, request config, thinking/reasoning controls, and usage limits.
- Keep tool execution and patch behavior provider-owned, not UI-owned.

### GLM OpenCode

Reference source:

- `CodeAI-Hub/packages/GLM_OpenCode_Module/src/provider/**`

Harness target:

- `product-parts/provider-runtime/clusters/provider-adapters/modules/glm-opencode-provider/**`

Required behavior:

- Preserve OpenCode runner/server process, SDK loader, runtime profile, SSE processor, turn stream, stream helpers, and output normalizer.
- Preserve thinking output normalization and provider-owned process lifecycle.

### OpenRouter And Local Models

Reference source:

- OpenRouter settings/search/endpoint behavior in CodeAI Hub settings and workflow services.
- `CodeAI-Hub/packages/core/src/local-models/**`

Harness target:

- `product-parts/provider-runtime/clusters/provider-adapters/modules/openrouter-provider/**`
- `product-parts/provider-runtime/clusters/provider-adapters/modules/local-models-provider/**`

Required behavior:

- Preserve OpenRouter endpoint/model selection contracts and request-body behavior used by reference settings/runtime flows.
- Preserve local models CLI/facade/provider adapter/runtime load manager/warmup/SSE reader behavior.
- Preserve local reasoning stream buffering so `reasoning.delta` frames are coalesced into readable `thinking` messages.
