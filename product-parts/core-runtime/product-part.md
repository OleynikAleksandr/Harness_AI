# Core Runtime

## Purpose

Out-of-process long-running local authority for workspaces, sessions,
orchestration, provider composition, settings, localization, and workspace
truth. Application Shell reaches this authority through the Core process
contracts, not through direct module imports.

## Owned Clusters

- `runtime-process`
- `workspace-architecture`
- `session-runtime`
- `session-profiles`
- `profile-studio`
- `provider-network-capture`
- `universal-client`
- `settings-and-localization`
- `project-workflow` — Workflow Kit (plan, transactional commits, recovery,
  quality profile, installation, doctor, autopilot decision, execution
  modes with executor assignments and integration)

`development-orchestrator` and `intent-normalization` were scaffolded as
`module.md`-only cluster placeholders early in the project and never
implemented; they were removed from the product tree (2026-07-01) rather than
kept as unimplemented debt. The plan-first lifecycle and quality gates are
now the `project-workflow` cluster (Workflow Kit): this repository runs it
through `scripts/workflow` and the Kit sections of `.husky/**` (see
`AGENTS.md`).

## Responsibilities

- Own workspace/session state and snapshots consumed by Application Shell.
- Own deterministic session auto-title, manual-title lock and regenerate
  commands; Application Shell only submits intent and renders the result.
- Own provider-neutral parent-child session graphs and persisted subagent
  timeline read models; clients only render them.
- Own next-session mode truth; Application Shell can display and submit mode choices but cannot decide provider behavior locally.
- Own provider adapter registration and provider session binding.
- Expose Core RPC and event-stream contracts consumed by Application Shell.
- Own provider CLI/version tooling and local-model discovery requests.
- Run the plan-first development process and quality gates of projects
  through the Workflow Kit (`project-workflow`), including the global git
  identity route, the execution mode card (a `sequential`/`orchestrated`
  choice turns on the owner session's autopilot), the Kit state watcher and
  the plan view with executor sessions.
- Give provider processes and Kit commands the user's login-shell PATH,
  read once at Core start.
- Coordinate providers through Provider Runtime facades.
- Normalize visible provider reasoning before it reaches UI snapshots.
- Promote provider session ids emitted by provider runtimes so Core keeps the authoritative binding for later turns.
- Preserve provider-neutral message tags and coalesce live assistant chunks before session readback/display.
- Own native request capture artifacts: raw upstream-request JSONL, separate
  diagnostics JSONL, and readable Markdown reports for profile-verification
  payload groups.
- Persist and validate Profile Studio v2 provider/model passports and their
  separate Draft-tolerant prompt source documents without turning renderer
  state into profile truth.
- Own Profile Studio lifecycle truth: immutable Draft identity, exact
  provider/model and creator-session binding, content-hash approval and
  edit-to-Draft transitions through class facades.
- Validate complete Profile Creator snapshots, provider-specific tool modes
  and contained Native Capture raw/diagnostic provenance before any managed
  profile mutation.
- Load the settings-selected Profile Creator Agent from four validated
  HARNESS_AI_HOME-aware components, compose its two-part base system prompt,
  append the Core-owned Settings communication-language directive with no
  ambient fallback and render its Core-owned first-message placeholders.
- Prepare Profile Creator sessions through fresh target Native Capture and
  validate only Core envelope facts, canonical containment, completion,
  identity and hash while leaving provider prompt/tool semantics to the agent.
- Supply an isolated Profile Creator turn contract with target authoring
  context and JSON Schema while keeping execution identity separate.
- Create and restore persistent Profile Creator sessions in the dedicated
  HARNESS_AI_HOME-aware Studio workspace, preserving their managed system
  prompt and applying the fixed structured-output schema on every turn.
- Validate normalized raw structured results only for Profile Creator sessions,
  publish controlled dialog text, atomically apply complete snapshots and
  bound automatic repair so rejected output cannot mutate profile documents.
- Project Profile Studio target/profile/inspector read models from Core truth,
  including Claude subset, Codex fixed and Kimi 9/25 Draft-only capability
  states.
- Expose typed Profile Studio list/get/create/approve RPC commands and
  profile-file update events; creation couples a Draft with its persistent
  creator session and approval preserves Core hash/capability gates.

## Out Of Scope

- Electron renderer composition.
- Application Shell windowing and display composition.
- Provider-specific protocol implementation details.
- Application Shell IPC, dialogs, window lifecycle and renderer transport.
