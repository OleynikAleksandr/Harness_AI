# Claude Provider Module

## Responsibility

Harness-packaged migration of the CodeAI-Hub Claude provider module.

## Public Facade

`ClaudeProviderFacade`

## Inputs

- Provider turn request.
- Active workspace path and selected Claude model from Core-owned settings.
- Claude provider-home/auth state.
- CodeAI-Hub-compatible applied turn options for model, thinking, effort, tools, system prompt/runtime profile, and structured output.
- Workspace `AGENTS.md`, read by provider runtime and injected inline into the Claude SDK system prompt.

## Outputs

- Provider events from the migrated Claude Agent SDK session/runtime path.
- Visible thinking/reasoning dialog messages emitted by the migrated Claude stream router and thinking dialog emitter.
- Provider usage/context telemetry.
- Claude Agent SDK runs with the active workspace as `cwd`, and the active workspace path plus `AGENTS.md` instructions are injected into the SDK system prompt by provider runtime.
- Provider home storage is Harness-owned: workspace sessions use `<workspace>/.harness/runtime/providers/claude/home`, and non-workspace fallbacks use `~/.harness-ai/providers/claude/home`.
- Packaged macOS app setup resolves `npm` through GUI-safe PATH augmentation before installing/checking the Claude Agent SDK, then resolves the Claude executable from the SDK platform optional dependency layout.

## Reference Alignment

- Source of truth: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Claude_Module/src/**`.
- The module keeps the CodeAI-Hub SDK manager, session manager, auth/home bridge, runtime profile, message processor, stream router, live buffers, thinking emitter, and focused runtime helpers under `src/reference/**`.
- The Harness facade is only an adapter from the Harness provider contract into the migrated reference provider module.
- Translation compatibility is currently local to this provider module and preserves the reference contract without moving translation truth into UI.
- Harness-specific workspace prompt injection is a focused additive helper around the migrated SDK prompt so Claude receives workspace path and `AGENTS.md` without relying on renderer state or native filesystem discovery.

## Owned Paths

- `module.md`
- `src/**`
