# Session Window Module

## Responsibility

Render the transcript/dialog layout and session chrome.

## Public Facade

`SessionWindowFacade`

## Inputs

- Session snapshot from Core Runtime.
- User interaction events from child controls.
- Provider settings snapshot for display-only labels. Codex reasoning labels use the Core settings-store capability resolver and disappear when the selected Codex model has no declared reasoning effort levels.

## Outputs

- Rendered chat session surface.
- Session-level UI actions sent to Core.

## Owned Paths

- `module.md`
- `src/**`
