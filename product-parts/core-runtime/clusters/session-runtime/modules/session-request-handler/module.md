# Session Request Handler Module

## Responsibility

Own Core session actions: create, resume, send, stop, and delete. This module is the only Core Session Runtime entry point for Application Shell session actions.

## Public Facade

`SessionRequestHandlerFacade`

## Inputs

- Workspace id/path.
- Session id or provider selection.
- Raw user message payload.
- Turn options from Core-owned settings/model binding.
- Core-owned provider settings used to derive applied turn options for all providers: model selection, Claude/Kimi/GLM thinking toggles, GLM reasoning effort, OpenRouter endpoint tag, and Codex reasoning effort/summary enablement. Codex effort is resolved through the settings-store Codex capability contract.

## Outputs

- Core session events.
- Provider dispatch requests through the provider adapter contract.
- Session errors and lifecycle state.
- Provider-visible reasoning projected through `session-reasoning-display` into `thinking` dialog messages before UI snapshots.
- Assistant live chunks tagged `live` are kept in Core session state so final provider full-text messages can be suppressed or reduced to an unseen live tail before UI display.

## Owned Paths

- `module.md`
- `src/**`
