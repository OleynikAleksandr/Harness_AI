# Session Window Module

## Responsibility

Render the transcript/dialog layout and session chrome.

## Public Facade

`SessionWindowFacade`

## Inputs

- Session snapshot from Core Runtime.
- Core session messages with provider-neutral role/tag fields.
- User interaction events from child controls.
- Provider settings snapshot for display-only labels. Codex reasoning labels use the Core settings-store capability resolver and disappear when the selected Codex model has no declared reasoning effort levels.
- Core-owned next-session mode selection. The current active behavior is always `Native · Raw`; managed/normalized choices are rendered as preview-only labels.
- Core-owned provider readiness descriptors and live `provider:status` events.

## Outputs

- Rendered chat session surface.
- Session-level UI actions sent to Core.
- Next-session mode panel display; session creation submits the native raw baseline and regression tests guard that preview choices do not change runtime input.
- New-session provider cards display Ready / Checking provider... / Preparing
  workspace... / Failed from Core readiness values; non-ready cards are disabled.

## Owned Paths

- `module.md`
- `src/**`
