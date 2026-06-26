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

## Outputs

- Core session events.
- Provider dispatch requests through the provider adapter contract.
- Session errors and lifecycle state.

## Owned Paths

- `module.md`
- `src/**`
