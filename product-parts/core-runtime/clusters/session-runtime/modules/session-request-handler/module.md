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
- Core-owned provider settings used to derive applied turn options such as Codex reasoning effort and reasoning summary enablement.

## Outputs

- Core session events.
- Provider dispatch requests through the provider adapter contract.
- Session errors and lifecycle state.
- Provider-visible reasoning projected through `session-reasoning-display` into `thinking` dialog messages before UI snapshots.

## Owned Paths

- `module.md`
- `src/**`
