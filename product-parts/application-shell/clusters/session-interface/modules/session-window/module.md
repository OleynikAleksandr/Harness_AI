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

## Dialog Bubble Visuals

- Dialog bubbles reproduce the reference (CodeAI Hub) `.session-dialog__message*`
  visual contract: provider-tinted assistant/thinking plates (Claude `#ff9105`,
  Codex `#01f0d8`, Kimi `#77d6ff`), the blue `#2c3b52` user plate, the muted
  thinking plate, asymmetric left/right margins, drop shadows, and the system-ui
  font in the dialog zone only (project-wide Space Grotesk is unchanged).
- Provider tint is derived from the Core-owned `session.providerId`; the renderer
  only maps that id to a CSS modifier and never classifies provider truth.
  Providers without a reference tint (glm-native, glm-opencode, openrouter,
  local-models) use the neutral assistant background.
- A thinking bubble is `role === "thinking"` or an assistant message tagged
  `thinking`. Bubbles render plain text (no markdown engine) and thinking plates
  stay expanded (no collapse toggle).
- The shared `.session-panel` surface (id bar, dialog, input, status) uses the
  reference grey backdrop `rgba(40,41,42,1)` with a single clean `1px solid
  rgba(67,68,70,1)` outline and no `box-shadow`. The outer app shell background
  is unchanged.
- The input panel copies the reference `.session-input*` visuals: a compact dark
  field (`rgba(30,30,30,1)`, 13px/lh20, radius 4, focused `rgba(32,32,32,1)`), an
  orange drag overlay, an outlined 36px action button that shows the play ▶ when
  idle and the red stop square while the agent works, a pulsing wait-copy overlay
  ("Agent is working… Please wait.") over the field — light `rgba(206,211,217,1)`
  at a 0.55–0.9 pulse so it stays readable on the dark field — and a monospace
  `total:` timer in the footer right. The Stop button calls Core `stopTurn`.

## Outputs

- Rendered chat session surface.
- Session-level UI actions sent to Core, including the running-turn Stop that
  calls Core `stopTurn` with the active session id.
- Next-session mode panel display; session creation submits the native raw baseline and regression tests guard that preview choices do not change runtime input.
- New-session provider cards display Ready / Checking provider... / Preparing
  workspace... / Failed from Core readiness values; non-ready cards are disabled.

## Owned Paths

- `module.md`
- `src/**`
