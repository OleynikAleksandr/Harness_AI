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
- Per-session turn timing comes from the Core event log only: the facade keeps
  a journal of `session:turn-state` events per session id (persisted log
  replayed on session activation plus live `onEvent` appends, merged
  chronologically without duplicates) and derives `{ activeMs, runningSince }`
  through the Core `turn-timing` module's `deriveTurnTiming`. The renderer
  never computes durations itself; ticking and formatting live in the
  `turn-timer` UI module. A trailing open turn from a previous app run
  (orphaned `running`) is shown only when the session id is also in the live
  `runningSessionIds` set, otherwise `TurnTimer` receives `null`.
- User interaction events from child controls.
- Provider settings snapshot for display-only labels. Codex reasoning labels
  use the Core settings-store capability resolver; Grok labels use its
  Core-selected per-model effort and disappear for provider-managed Composer;
  Kimi labels show the Core-selected per-model native thinking level
  (`providers.kimiClient.reasoningByModel`, session override first) since
  the 2026-07-17 native thinking stream.
- Core-owned next-session mode selection. The current active behavior is always `Native · Raw`; managed/normalized choices are rendered as preview-only labels.
- Core-owned provider readiness descriptors and live `provider:status` events.
- Ephemeral Core `session:provider-interaction` and resolved events. The session
  window keeps at most the latest pending interaction per Core session and
  never persists it or reconstructs it from provider text.
- Core-owned localization runtime payload from the Electron preload bridge.
- The shared `vite-env.d.ts` bridge contract models Native Request Capture
  `defaultReasoningEffort` as nullable, matching Core providers such as Kimi
  that expose no independent reasoning selector.
- The shared bridge types also declare the Core Profile Studio target,
  compatible profile, inspector, Draft creation, exact-hash approval and
  isolated update-subscription contracts. Session Window does not consume
  those commands/events; the later Studio shell uses the same declaration.
- The `ProviderVersionsSnapshot` bridge type carries `kimi: { cli }` without a
  `packageName` (the Kimi CLI is a standalone binary, not an npm package) and
  `updateProviderVersion` accepts `provider: "kimi"`; the snapshot stays
  Core-computed truth from `get-provider-versions`.
- Session dialog, input, status, empty-state, and role labels resolve through
  the shared browser localization provider with fallback strings.
- The session status panel renders only Core telemetry truth. Every provider
  receives the same lower-panel contract and ordering: applied Model,
  supported reasoning effort, Tokens, Cache and Turns — no panel surfaces the
  Rollback action since 2026-07-18 (user order hid Codex first and Grok right
  after). `turnCount`
  comes from Core/provider events rather than counting user messages in the
  renderer; `Cache: 0` is visible from session start for Codex and Grok.
  `statusPanelCapabilities` controls field/action visibility and supplies the
  two-turn warmup/cache-anchor policy. Rollback would forward that preserved
  count
  to Core while idle; Core derives depth, validates the binding and restores
  transcript plus telemetry. Providers without a capability keep only their
  supported status fields, without renderer-owned provider allowlists. All
  four providers count turns from Core/provider `turn_completed` events, and
  the Codex/Grok Core rollback intents stay wired behind the hidden
  action. The
  panel lays its chips out as one flex row where the Tokens chip is the only
  flexible cell, so every provider chip set — with or without the reasoning
  badge and Rollback — stays on a single line; the former fixed-column grid
  (with a Codex rollback modifier) wrapped Turns to a second row once the
  Kimi reasoning badge became a sixth chip (2026-07-18 acceptance defect).
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
  executes, and every anchor routes through the Electron window-open handler.
  Absolute unix/file-URI hrefs with an optional `:line[:column]` suffix become
  `vscode://file/...` anchors, so a click opens the referenced workspace file
  at that line in VS Code (the same route the profile file buttons already
  use). Schemeless relative hrefs (for example `.harness/plans/todo-plan.md`)
  resolve against the Core-provided active workspace root passed down from the
  session window facade, so they address files of the concrete workspace.
  Inline code whose text looks like a workspace file path (slash-separated
  with a dotted file segment, optional `:line[:column]`, no whitespace) wraps
  into the same `vscode://file` anchor and reads as a clickable dotted link,
  while ordinary inline code, block code and non-path tokens like `89/89` or
  `thread/read` stay untouched;
  `https`/`http` targets open in the default system browser, and the handler
  denies every other protocol. Rendered links wrap as whole units
  (inline-block) instead of breaking at hyphens mid-link.
  User, system and thinking messages
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
  bottom boundary of the lowest anchored timeline element plus enough reserve
  for the bubble shadow. The anchor selector covers message bubbles AND the
  subagent launch divider (`.session-subagent-divider`) — the divider renders
  below the last bubble when a swarm launches, and a bubble-only anchor left
  it out of view (2026-07-18 acceptance defect). A `ResizeObserver` watches
  the same elements and repins when an earlier thinking bubble grows after a
  later assistant bubble already exists.
- `session-dialog-panel.tsx` merges translated/coalesced messages with
  `CoreSubagentCall.createdAt` entries into one timestamp-ordered timeline.
  Consecutive subagent launches collapse into one `SubagentLaunchDivider`
  (user decision 2026-07-13, docs/architecture/ClaudeSubagentSessions.md
  section 5): a horizontal rule broken in the middle by the localized
  "Subagents launched" label and the total launch count (sum of
  `max(childSessionIds.length, 1)` per call), which grows in place
  (1, 2, 3, ...) as new launches join the group. The divider carries no task
  list, buttons, status rings or metadata rows — child controls and live
  statuses live in the sidebar tree only. A spawn event without a child id
  yet still counts as one launch and is enriched in place when Core
  publishes the updated call. The rule line tone is `#586e84` — twice the
  brightness of the `#2c3742` border tone it started from (user acceptance
  feedback 2026-07-13).
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
  at a 0.55–0.9 pulse so it stays readable on the dark field — and turn timers
  driven by the Core turn lifecycle. While a turn runs, the `turn-timer`
  module's `TurnTimer` renders a monospace `turn: HHh MMm SSs` clock
  (`.session-input__turn`) inside the input row between the textarea and the
  ▶/Stop action button; it disappears when the turn ends. The footer right
  holds `SessionTotalTimer` (`.session-input__total`), the static summed
  duration of every completed turn (`activeMs` from the Core `turn-timing`
  derivation) — it no longer counts from session creation. The Stop button
  calls Core `stopTurn`.

## Text Hierarchy

- A layer at the end of `session-window.css` makes primary roles (sidebar session
  names, panel/section headers, message role labels, telemetry and id-bar labels)
  `font-weight: 500`, and secondary roles (section kickers, message meta and
  timestamps, telemetry counters, provider/mode card meta, the input hint and
  the turn/total timers, the status label) italic + `font-weight: 300`, dimmed to
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
- Inline subagent launch dividers at their Core-recorded spawn position;
  opening or detaching happens from the sidebar tree and is emitted with the
  child Core session id, never a parsed provider/rollout identifier.
- Selecting a child renders its live transcript with a parent breadcrumb,
  delegated task, agent/model/reasoning/status metadata and no input composer.
  Open-in-place and detached-window actions live in the sidebar tree.
- The approved visual layer reuses existing `--pm-*` tokens and lucide icons:
  sidebar width is user-resizable from 240 to 360 px, nested branches use a
  quiet connector, status colors are shared by tree/header, the inline call
  panel stays text-only, and child/detached layouts reserve a compact
  metadata header above the transcript.
- Sidebar rename and regenerate-title actions call the typed preload/Core
  commands. Successful mutations refresh only the session list; title
  validation and `titleOrigin` authority remain in Core.
- Session-level UI actions sent to Core, including the running-turn Stop that
  calls Core `stopTurn` with the active session id.
- In-app Grok interaction dialogs for tool permission, ask-user questions and
  plan approval. They render only the sanitized provider-neutral Core read
  model, support native option IDs, single/multiple/free-form answers and
  optional plan feedback, then send one typed decision through
  `respondProviderInteraction`. Cancel/close is an explicit `cancelled`
  decision; no native browser alert/prompt/confirm is used. The dialog is
  session-scoped and disappears only after the matching Core resolved event.
- Capability-driven Rollback control, currently not surfaced in any provider
  panel (the Codex and Grok panel actions are hidden since 2026-07-18 by user
  order while both Core intents stay wired
  behind the capability). It dispatches only
  the raw `{ sessionId, preserveFirstUserTurns }` intent supplied by Core
  telemetry capabilities, keeps
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
  Core-owned `defaultModelId` on a single-model provider descriptor wins over
  the settings-snapshot lookup; multi-model client endpoints use the Core
  settings snapshot (Kimi → `providers.kimiClient.defaultModel`, GLM →
  `providers.glmClient.defaultModel`). The
  renderer never invents a model id. The same resolution feeds the `model` field
  of `createSession`. The visible `openrouter-client` and
  `local-models-client` resolve through the shared settings sections
  (`providers.openRouter.defaultModel` / `providers.localModels.defaultModel`);
  Grok resolves through `providers.grok.defaultModel`, so its ready card and
  the created Core session carry the same exact selected model instead of the
  former `cli-default` placeholder; Kimi likewise displays and creates the
  session with the exact Settings selection instead of `cli-default`;
  the retired legacy `glm-native`/`openrouter`/`local-models` model cases left
  `getProviderModel` with the 2026-07-05 legacy cleanup, and the ACP `kimi`
  case left with the kimi-provider retirement. The session-panel endpoint-tag
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
