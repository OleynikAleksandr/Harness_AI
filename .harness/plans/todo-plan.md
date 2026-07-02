# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-profiles-v2-plan-document-2026-07-02",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream1.task2",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user discussion (2026-07-02): the v1 category
  whitelist silently cuts real provider tools (Claude native stack has 10
  tools, proxy-captured; `Agent`/`Skill`/`ToolSearch`/`ScheduleWakeup` are
  always cut), the fixed category vocabulary gives the user nothing real to
  choose from, and editing three documents per profile is inconvenient. The
  user ordered a new planning document as the base for this todo-plan:
  single `profile.md` document (frontmatter + prompt body, clean break, no
  compatibility), provider tool inventory (Claude SDK `init` capture +
  probe, GLM adapter export), deny-list "vendor set minus off" semantics,
  Profile Creator tool selection. Codex/Kimi channels are an explicitly open
  question to be discussed separately before their phases are planned.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `docs/architecture/SessionProfiles.md`
- Keep the context pack short. Use `docs/DOCUMENTATION_INDEX.md` to choose the
  few documents relevant to this scope; do not paste a full Markdown inventory
  into every plan.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for
  workflow, settings, provider state, limits, tokens, reasoning, artifacts or
  orchestration.
- Any source change updates every related Markdown document in the same commit:
  affected `module.md`, `cluster.md`, `product-part.md`, architecture docs,
  product tree docs, README/AGENTS/CLAUDE when relevant, and any related
  `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are
  added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan — it may only suggest it and wait for the user's direct order.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Session Profiles V2 Planning Document (owner: Codex + User, updated: 2026-07-02)

### Stream: Planning Document And Review

1. [DONE] `harness-ai.phase1.stream1.task1` Write the session profiles v2 planning document capturing the agreed decisions (single `profile.md` with YAML frontmatter + prompt body, clean break without v1 compatibility, provider tool inventory with Claude SDK `init` capture + on-demand probe and GLM adapter export, deny-list "vendor set minus off" application semantics with exact tool names replacing the v1 category vocabulary, Profile Creator tool selection UI, Codex/Kimi channels as an explicitly open question) plus the phase roadmap for expanding this plan (scope: `docs/architecture/SessionProfilesV2.md` (new), `docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): add session profiles v2 planning document`). Result: Completed in commit `docs(architecture): add session profiles v2 planning document`.
2. [DONE] Git Commit: `docs(architecture): add session profiles v2 planning document` (hash: self)
3. [DONE] `harness-ai.phase1.stream1.task3` User review findings, round 1 (chat, 2026-07-02): (a) the universal profile stays the primary model — a per-provider application is derived from the one shared document instead of six near-identical copies (the "architect" profile example), so the frontmatter `tooling:` becomes a flat list of exact tool names where an unlabeled name applies to every provider whose inventory has it and a `@<providerId>` label narrows a name to one provider; (b) prompt universality is explicitly NOT proven — the CodeAI-Hub experiment (GLM 5.2 answering with the Claude system prompt noticeably better than with its own) means the "multi-profile vs per-provider prompt+tooling tuning" decision requires a research phase (comparative quality runs) recorded as a new open question and a roadmap Phase R; update `docs/architecture/SessionProfilesV2.md` accordingly. Plan state repair note: the open review task `task2` returned to [TODO] below and this findings task was inserted before it so the machine-managed flow resumes the review after this commit (scope: `docs/architecture/SessionProfilesV2.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): capture v2 review findings on flat tool labels and prompt research`). Result: Completed in commit `docs(architecture): capture v2 review findings on flat tool labels and prompt research`.
4. [DONE] Git Commit: `docs(architecture): capture v2 review findings on flat tool labels and prompt research` (hash: self)
5. [DONE] `harness-ai.phase1.stream1.task4` User review findings, round 2 (chat, 2026-07-02): (a) fix the GLM 5.2 experiment fact — GLM has no own system prompt to take (no CLI, ZCode desktop is closed); the CodeAI-Hub comparison was between the Claude and Codex system prompts, and Claude's won; (b) capturing native references is agreed as a v2 decision: the open-source `claude-tap` local proxy (MIT, reverse mode for Claude Code / Codex CLI / Kimi CLI, JSONL traces + ctap/HTML export, auth headers auto-redacted) is the dev-time instrument to periodically capture real system prompts and full tool schemas, converted into readable markdown reference dumps (CodeAI-Hub format); GLM needs no capture (our adapter owns its stack); the Codex/Kimi open question narrows to application channels only; Phase R expands with native capture and prompt section analysis (immutable vs excessive blocks). Plan state repair note: the open review task `task2` returned to [TODO] below again and this findings task was inserted before it (scope: `docs/architecture/SessionProfilesV2.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): adopt claude-tap native capture and correct glm prompt experiment fact`). Result: Completed in commit `docs(architecture): adopt claude-tap native capture and correct glm prompt experiment fact`.
6. [DONE] Git Commit: `docs(architecture): adopt claude-tap native capture and correct glm prompt experiment fact` (hash: self)
7. [DONE] `harness-ai.phase1.stream1.task5` User review findings, round 3 (chat, 2026-07-02): borrow only what we need from claude-tap instead of adopting it — the server response is not needed for capture (the system prompt is `body.system`, the tool schemas are `body.tools`, proven by the CodeAI-Hub `request_captured` dump), the app/GUI/viewer/14-client breadth is not needed (we drive three CLIs in reverse mode), and the raw request material must be transformed by our own converter into readable dumps; decision 5 becomes an in-house minimal Node dev-time capture module (transit-forward reverse proxy recording only the request body, headers never written so auth secrets cannot leak; claude-tap stays the mechanics reference; the no-network fake-response alternative is rejected for MVP as it would emulate three response protocols), with the Claude probe running through our own adapter env; update `docs/architecture/SessionProfilesV2.md` and the documentation index entry accordingly. Plan state repair note: the open review task `task2` returned to [TODO] below again and this findings task was inserted before it (scope: `docs/architecture/SessionProfilesV2.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs(architecture): replace claude-tap adoption with an in-house native capture module`). Result: Completed in commit `docs(architecture): replace claude-tap adoption with an in-house native capture module`.
8. [DONE] Git Commit: `docs(architecture): replace claude-tap adoption with an in-house native capture module` (hash: self)
9. [IN_PROGRESS] `harness-ai.phase1.stream1.task2` User reviews the planning document; the open questions (prompt universality research methodology; Codex/Kimi tooling application channels) are discussed separately and the document plus this plan are expanded with the outcome and the implementation phases (scope: user review + follow-up plan expansion; expected commit: none).
