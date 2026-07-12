# Session Window Module

## Responsibility

Render the transcript/dialog layout and session chrome.

## Public Facade

`SessionWindowFacade`

## Inputs

- Session snapshot from Core Runtime.
- Core session messages with provider-neutral role/tag fields.
- Core `session:subagent-call` timeline snapshots and child `CoreSession`
  metadata. The renderer upserts snapshots by stable call id and does not infer
  spawn activity from message text.
- Core `session:created` / `session:updated` notifications refresh the visible
  session index without replacing the active selection. This keeps the live
  child tree and child header current while a parent turn continues.
- Running state is tracked as a set of Core session ids. Concurrent parent and
  child turns therefore cannot overwrite one shared running-session scalar;
  the composer remains disabled until its own session becomes idle.
- User interaction events from child controls.
- Provider settings snapshot for display-only labels. Codex reasoning labels use the Core settings-store capability resolver and disappear when the selected Codex model has no declared reasoning effort levels.
- Core-owned next-session mode selection. The current active behavior is always `Native · Raw`; managed/normalized choices are rendered as preview-only labels.
- Core-owned provider readiness descriptors and live `provider:status` events.
- Core-owned localization runtime payload from the Electron preload bridge.
- Session dialog, input, status, empty-state, and role labels resolve through
  the shared browser localization provider with fallback strings.
- For Codex sessions, the session status panel
  renders the display-only visible turn count from the current transcript
  (`role === "user"`) immediately before the Codex-family Rollback button,
  between the
  Tokens/optional Cache telemetry and Rollback. Provider-reported
  `cacheDisplay` renders beside the Core-owned token telemetry when available.
  The Codex-family Rollback button preserves the first two visible user
  turns as the warmup/cache-anchor pair by sending Core the
  `preserveFirstUserTurns: 2` policy while the session is idle; Core derives
  `numTurns`, validates provider id/binding/turn count, and restores transcript
  plus token/cache telemetry to the anchor snapshot. Non-Codex-family sessions
  keep the standard token-only status layout.
- The session window owns refresh of the browser localization runtime payload
  and passes that refresh callback to Settings, so save/reset can show newly
  materialized localized copy without reopening the app shell.

## Dialog Bubble Visuals

- Dialog bubbles reproduce the reference (CodeAI Hub) `.session-dialog__message*`
  visual contract: provider-tinted assistant/thinking plates (Claude `#ff9105`,
  Codex `#01f0d8`, Kimi `#77d6ff`), the blue `#2c3b52` user plate, the muted
  thinking plate, asymmetric left/right margins, drop shadows, and the system-ui
  font in the dialog zone only (project-wide Space Grotesk is unchanged).
- Provider tint is derived from the Core-owned `session.providerId`; the renderer
  only maps that id to a CSS modifier and never classifies provider truth.
  The Kimi tint follows the universal-client `kimi-client` id (the ACP `kimi`
  id left with the kimi-provider retirement, 2026-07-05). Providers without a
  reference tint (the other universal-client endpoints) use the neutral
  assistant background.
- A thinking bubble is `role === "thinking"` or an assistant message tagged
  `thinking`. Regular assistant replies render GFM markdown (tables, lists,
  code, links) through the renderer-only `SessionMarkdownContent` component
  built on `react-markdown` + `remark-gfm` with `skipHtml`: raw HTML never
  executes, and external links open through the Electron window-open bridge
  (`target="_blank"` → system browser). User, system and thinking messages
  stay plain text — the 2026-07-12 packaged retest explicitly returned
  thinking plates to the thin pre-wrap format (markdown had merged their
  single-newline sections into one bold wall) — and thinking plates stay
  expanded (no collapse toggle). Markdown elements are styled for the dark
  dialog theme — bordered horizontally scrollable tables that wrap by whole
  words (no inherited anywhere-breaks shattering narrow columns), dark code
  blocks, compact headings/lists, blockquotes and reference-blue links — while
  plain-text bubbles keep the `pre-wrap` contract. Inside reply paragraphs
  every sentence starts on its own display line (a renderer-only formatter
  splits text nodes on `.!?` + whitespace + uppercase and paragraphs render
  with `pre-line`, which also keeps author soft line breaks visible); code,
  tables, lists and inline elements are untouched.
- Pending translated reasoning hides the source text until Core patches
  `localizedContent`; translated thinking is revealed progressively in the
  renderer while source `text` remains unchanged in state. When a provider
  updates the same reasoning message id with more pending source text, the
  renderer preserves the previous Core-provided `localizedContent` prefix until
  the next Core translation patch arrives. The translated-text reveal itself is
  prefix-stable: when localized reasoning grows, it keeps the longest already
  visible common prefix and animates only the new suffix.
- The dialog autoscroll mirrors the CodeAI Hub reference bottom-lock behavior:
  while the user has not intentionally scrolled away, the scroll target is the
  bottom boundary of the lowest visible message bubble plus enough reserve for
  the bubble shadow. A `ResizeObserver` watches visible bubbles and repins when
  an earlier thinking bubble grows after a later assistant bubble already
  exists.
- `session-dialog-panel.tsx` merges translated/coalesced messages with
  `CoreSubagentCall.createdAt` entries into one timestamp-ordered timeline.
  Inline cards keep the normal dialog bubble boundary, show delegated task as
  the primary label, nickname/role/model/reasoning/status as secondary
  metadata, and render open + detached-window controls for each child Core id.
  A spawn event without a child id yet remains visible as a pending card and is
  replaced in place when Core publishes the updated call.
- The shared `.session-panel` surface (id bar, dialog, input, status) uses the
  reference grey backdrop `rgba(40,41,42,1)` with a single clean `1px solid
  rgba(67,68,70,1)` outline and no `box-shadow`. The outer app shell background
  is unchanged.
- The input panel copies the reference `.session-input*` visuals: a compact dark
  field (`rgba(30,30,30,1)`, 13px/lh20, radius 4, focused `rgba(32,32,32,1)`, and
  no opacity fade while disabled so it stays visible as the agent works), an
  orange drag overlay, an outlined 36px action button that shows the play ▶ when
  idle and the red stop square while the agent works, a pulsing wait-copy overlay
  ("Agent is working… Please wait.") over the field — light `rgba(206,211,217,1)`
  at a 0.55–0.9 pulse so it stays readable on the dark field — and a monospace
  `total:` timer in the footer right. The Stop button calls Core `stopTurn`.

## Text Hierarchy

- A layer at the end of `session-window.css` makes primary roles (sidebar session
  names, panel/section headers, message role labels, telemetry and id-bar labels)
  `font-weight: 500`, and secondary roles (section kickers, message meta and
  timestamps, telemetry counters, provider/mode card meta, the input hint and
  token total, the status label) italic + `font-weight: 300`, dimmed to
  `--pm-text-muted`. Provider-tinted role colours, semantic/accent colours, the
  message body, reasoning/thinking content and input-typed text are left
  untouched. The bare element resets (`button/h*/strong { font-weight: 300 }`)
  are 0,0,1, so these class selectors win without extra scoping. Shared `--pm-*`
  tokens lift primary brighter (`#f1f3f5`) and dim muted (`#767d86`); the italic
  secondary text uses a slightly brighter `--pm-text-secondary` (`#868d97`).
- The `.start-new-session-button` resets `font-style: normal` so it stays upright
  inside its now-italic `.sidebar-section-header` container.

## Outputs

- Rendered chat session surface.
- Inline subagent entry points at their Core-recorded spawn position; opening
  or detaching is emitted with the child Core session id, never a parsed
  provider/rollout identifier.
- Selecting a child renders its live transcript with a parent breadcrumb,
  delegated task, agent/model/reasoning/status metadata and no input composer.
  The same child id drives open-in-place and detached-window actions from both
  the timeline and sidebar.
- The approved visual layer reuses existing `--pm-*` tokens and lucide icons:
  sidebar width is user-resizable from 240 to 360 px, nested branches use a
  quiet connector, status colors are shared by tree/card/header, inline calls
  form a responsive card grid, and child/detached layouts reserve a compact
  metadata header above the transcript.
- Sidebar rename and regenerate-title actions call the typed preload/Core
  commands. Successful mutations refresh only the session list; title
  validation and `titleOrigin` authority remain in Core.
- Session-level UI actions sent to Core, including the running-turn Stop that
  calls Core `stopTurn` with the active session id.
- Enabled Rollback control in the Codex-family status panel. It dispatches only
  the raw `{ sessionId, preserveFirstUserTurns: 2 }` intent to Core, keeps
  renderer code out of rollback-depth calculation, shows controlled transcript
  notices for success/failure, and applies Core `session:messages-replaced`
  events to refresh the visible transcript after rollback.
- Next-session mode panel display; session creation submits the native raw baseline and regression tests guard that preview choices do not change runtime input.
- New-session provider cards display Ready / Checking provider... / Preparing
  workspace... / Failed from Core readiness values; non-ready cards are disabled.
- The provider picker renders as a full-cover modal: its backdrop carries a high
  z-index (above the position:relative dialog bubbles and the next-mode panel)
  and a dense scrim, so the running session UI does not show through.
- Opening the provider picker re-queries `listProviders` from Core, so the card
  reflects the live catalog (provider renames, Restart Core) instead of the list
  cached at renderer startup.
- Provider card model labels resolve through `resolveProviderModel`: a
  Core-owned `defaultModelId` on the provider descriptor (universal-client
  endpoints, e.g. the visible Kimi → `kimi-for-coding`) wins over the
  settings-snapshot lookup; multi-model client endpoints such as the visible GLM
  use the Core settings snapshot (`providers.glmClient.defaultModel`). The
  renderer never invents a model id. The same resolution feeds the `model` field
  of `createSession`. The visible `openrouter-client` and
  `local-models-client` resolve through the shared settings sections
  (`providers.openRouter.defaultModel` / `providers.localModels.defaultModel`);
  the retired legacy `glm-native`/`openrouter`/`local-models` model cases left
  `getProviderModel` with the 2026-07-05 legacy cleanup, and the ACP `kimi`
  case left with the kimi-provider retirement (the visible Kimi resolves
  through the Core-owned `defaultModelId`). The session-panel endpoint-tag
  badge follows the live `openrouter-client` sessions.

- New-session wizard step 2 (`session-profile-step.tsx`): after the
  provider card, the profile picker lists Core-provided applicable profiles
  (Native first, invalid entries disabled), preselects the Core-remembered
  last choice per provider, and submits the selection through the existing
  `createSession` `nextSessionMode` (`invocationMode`/`managedProfileId`);
  Core rejections (broken profile) render inside the step. The renderer
  never derives profile truth. Core event routing helpers live in
  `session-window-core-events.ts` (split out for the 500-line cap).
  While the step is open it also listens for `session-profiles:updated`
  Core events (profile file watcher) and re-runs the catalog RPC, keeping
  the user's still-valid current selection and falling back to Native
  otherwise, so profile edits saved in VS Code show up without an app
  restart.

- The legacy `Next Session Mode` panel/dialog is removed: the profile step
  of the new-session wizard owns the selection surface, and the renderer no
  longer hardcodes `native/raw` (the submitted `nextSessionMode` comes from
  the user's step choice).

- The session header shows the applied profile chip
  (`SessionProfileChip` in `reference-session-panels.tsx`), driven strictly
  by `CoreSession.appliedProfile` from the Core snapshot: managed profiles
  show their display name, Native shows "Native", and sessions persisted
  before profiles show a "Legacy" marker.

- The session id bar (`SessionIdPanel`) is a single-row two-column grid: the
  left identity column stacks the session id and the applied profile chip as
  two rows (mirroring the two limit rows), and the right column holds the
  usage limit rows pinned to the right edge, keeping the bar compact.

## Owned Paths

- `module.md`
- `src/**`
