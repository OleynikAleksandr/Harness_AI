# Harness AI Agent Instructions

This is the main directive for developing Harness AI. Follow it at the start
of every session in this workspace. The development process itself (plan,
tasks, commits, recovery, acceptance) is owned by the Workflow Kit; its
managed section at the end of this file is authoritative for the process.

## 0. Language And Working Mode

- Talk to the user in Russian. Code, code comments, identifiers and agent
  rules are in English.
- Do not add abstractions, factories, interfaces, configs, layers,
  dependencies or "future" extensibility without a current architecture
  contract or a direct user requirement.
- CodeAI Hub is a reference project. Do not copy whole modules; carry
  behaviour over through new Harness AI modules in the correct
  Product Part / Cluster / Module tree.

## 1. Session Start And Navigation

- The Workflow Kit recovery packet (SessionStart hook, or
  `scripts/workflow recover --format text`) is the only recovery mechanism.
  The plan lives in `.harness/plans/todo-plan.md` and is machine-managed.
- Use `docs/DOCUMENTATION_INDEX.md` to choose only the documents relevant to
  the current task; `docs/architecture/OVERVIEW.md` summarises the system.
- Legacy reports, commit lists and loose notes are not a recovery mechanism.
  `.harness/plans/archive/**` holds closed scopes for history only.
- One micro-task should touch at most three functional files unless the plan
  splits the work differently.

## 2. Architecture And Ownership

- The Product Part / Cluster / Module tree is primary. Production code lives
  under `product-parts/**`.
- Every Product Part contains Clusters; every Cluster contains Modules.
- A module owns only its `module.md` and `src/**`.
- External access to a module goes through its public facade (`*facade.ts`,
  `*facade.mjs` or an explicitly named facade component).
- New functionality or a new algorithm means a new module or a strictly
  additive change of an existing module.
- Do not touch a closed, working module without need. Fix the root cause in
  the shared route when sibling callers go through it.
- An implementation file must not exceed 500 lines
  (`scripts/check-architecture.mjs` enforces it).
- Documentation must be 100% relevant to the current code. A module's
  `module.md` changes in the same commit as its `src/**` (the Kit check
  `kit:docs-contracts`). Shared documents (`cluster.md`, `product-part.md`,
  `docs/architecture/**`, `.harness/product-tree/**`, `README.md`, indexes)
  are reconciled by the DOCS task of each round. Outdated documentation is a
  defect on a par with broken code.
- `docs/DOCUMENTATION_INDEX.md` is the mandatory catalog of tracked Markdown
  documentation. Adding, moving or removing a `.md` / `.markdown` file updates
  the index in the same commit.

## 3. Core Authority

- UI, the Electron host, a future VS Code surface, web/mobile clients and any
  transport/input surface are never the source of workflow truth.
- UI is not the source of truth for product state, session state, provider
  state, settings, limits, tokens, workflow or orchestration decisions,
  localization state, artifact truth or managed lifecycle. UI only passes
  user input and displays data/commands from Core or shared read-model
  contracts.
- UI does not classify, recognise or derive product truth from text or
  provider payloads. The renderer never decides what is reasoning/thinking,
  assistant output, status, a limit, a model or a provider capability; these
  facts arrive normalised from Core/shared contracts.
- Calculation, derivation, normalisation and validation live in Core Runtime
  or a shared contract module, never in renderer/client code.
- Core Runtime owns session state, provider binding, the settings snapshot,
  orchestration state, gates, the localization target, system instructions,
  project workflow (Workflow Kit host, autopilot) and managed lifecycle.
- Behaviour that breaks without an open UI is an architecture defect.
- When one fact is available from several places, first establish a single
  Core/shared source of truth, then connect the display. Never patch
  discrepancies with UI heuristics.
- Prompt templates, schemas, examples and repair contracts reach the provider
  prompt inline. A file reference is allowed only as provenance or an output
  target.
- Artifact parser/validator/read-model truth belongs to Core/shared contract
  modules.
- The managed repair lifecycle enters Core as raw intent; a client never
  builds repair prompts around Core.

## 4. Where Documents Live

- Active plan (Kit-managed): `.harness/plans/todo-plan.md`.
- Kit configuration, quality profile and docs contracts (Kit-managed):
  `.harness/workflow/config.json`.
- Archived closed-scope plans: `.harness/plans/archive/<planId>.md`.
- Product tree source: `.harness/product-tree/product-tree.json`; readable
  projection: `.harness/product-tree/product-tree.md`.
- Documentation catalog: `docs/DOCUMENTATION_INDEX.md`.
- Architecture proposals awaiting discussion: `docs/proposals/**`. They are
  non-authoritative and must be reconciled with live truth and promoted into
  `docs/architecture/**` before implementation planning.
- Architecture/planning docs: `docs/architecture/**`.
- Verification evidence: `docs/evidence/**`.
- Runtime state, provider homes, auth residue, caches and logs: ignored local
  state only.

## 5. Quality Checks

- Checks run through the Kit quality profile (`.harness/workflow/config.json`,
  `docs/architecture/workflow-kit/WorkflowKitQuality.md` §9):
  - prepare: `npx ultracite fix {files}`;
  - commit: architecture, lint (`ultracite check`), knip, typecheck, tests,
    plus Kit builtins (doc size, Markdown links, docs contracts);
  - push: duplication, security audit, links;
  - delivery: `npm run package:mac`.
- Never bypass hooks or checks with `--no-verify`.
- A plan never contains a separate "run the gates" task: every commit runs
  them. A final delivery task exists only when the change is visible in the
  packaged app.
- Manual runs are for diagnosis and before packaging:
  ```bash
  npm run quality
  npm run check:dup
  npm run check:security
  npm run check:links
  npm run build
  ```

## 6. UI And Electron Safety

- Never use native `window.alert`, `window.prompt` or `window.confirm` in the
  Electron UI. Rename/Delete/confirm flows are in-app React menus/dialogs.
- A visible control is never a temporary stub. If a control is shown, it
  works or is honestly excluded from the MVP.
- The UI follows the Project Manager dark theme conventions, implemented in
  Harness AI modules.

## 7. Runtime State And Secrets

- `.harness/runtime/**`, `.harness/workflow/local/**`, `.codeai-hub/**`,
  provider homes, auth files, caches, logs and locks are local runtime state
  and are never tracked.
- Product/system settings may write under `~/.harness-ai/**` or
  `HARNESS_AI_HOME`. Workspace-local settings may write under
  `<workspace>/.harness/settings/**`.
- Session history uses append-only JSONL under `.harness/sessions/**`.

## 8. Release And Packaging

- A release/package build runs only in a `delivery` task, started with the
  user's confirmation (`task:start <ID> --confirmed "<note>"`).
- Build order (different artifacts):
  ```bash
  npm run build        # rebuilds dist/ only (renderer, runtime, Workflow Kit bundle)
  npm run package:mac  # rebuilds app.asar inside release/mac-arm64/Harness AI.app
  ```
- `npm run build` does not update the packaged `Harness AI.app`. Anything the
  user checks in the packaged app needs `npm run package:mac` and an app
  restart.
- Before handing over the unsigned macOS app, verify that
  `release/mac-arm64/Harness AI.app` exists.
- Every plan ends with a publication task (`delivery`, after the package):
  push `main` to `origin` (`https://github.com/OleynikAleksandr/Harness_AI`,
  public), tag `vYYYY.M.D` (`.N` suffix on the same day), and a GitHub
  Release with the round digest as notes and a zip of the unsigned
  `Harness AI.app`. Before every publication the history is scanned for
  secrets. `package.json` versions stay unchanged. Spec:
  `docs/architecture/ReleaseFixes-2026-11-04-2.md` section 8.
- User acceptance is recorded only after the user's explicit positive answer
  (`scripts/workflow accept --note "<the user's words>"`). Defects reported by
  the user become a fixes round instead.
- Closing the scope (`scripts/workflow close`) happens only on a separate,
  direct user command. Acceptance is not such a command. The agent may only
  suggest closing.

## 9. Critical Rules

- No temporary solutions without explicit agreement.
- A started feature is brought to a working state within the agreed scope.
- Never revert other people's changes without a direct request.
- Never edit `package.json` versions by hand without a separate
  release/versioning decision.
- Never print secrets (provider keys, tokens, auth files).

<!-- workflow-kit:begin -->
## Workflow Kit (managed section — do not edit by hand)

This project uses the Harness Workflow Kit. The plan lives in
`.harness/plans/todo-plan.md` and changes only through `scripts/workflow`
commands (Windows: `scripts\workflow.cmd`). Every command prints JSON;
add `--format text` for a readable answer.

### Start of every session
1. Unless a workflow recovery packet is already in your context, run
   `scripts/workflow recover --format text`.
2. Follow the `next` line of the packet.

### When a plan is needed
- Discussion, research, specifications and documentation-only commits need
  no plan. Commit documents with `scripts/workflow docs:commit --files <paths>`.
- Changing functional files is allowed only inside a started task of the
  active scope.
- A clear user instruction to implement allows you to write the
  specification and create the scope with
  `scripts/workflow scope:create --input <file.json>` without asking again.
  Record the agreement in `approval`. The plan never replaces the user's
  current instruction. In a Harness project (`"host": "harness"`) propose
  the scope instead (see Execution modes).

### Execution modes
The recovery packet names your `role:`; follow it.
- **planning** (no scope, Harness project): write the specification and a
  plan with `parallelSafe` labels, then run
  `scripts/workflow scope:propose --input <file.json> --recommended <mode> --reason "<why>"`
  and end the turn; the user chooses the mode on the card.
- **self** (`sequential`): run the tasks in order in main. Helper subagents
  may help, but they work in main without their own worktree and never commit.
- **orchestrator** (`orchestrated`, main): `assignment:next`,
  `assignment:create --task <ID>`, a Claude subagent (Agent tool with
  `isolation: "worktree"`) gets the returned brief; integrate its SHA with
  `integration:start --id <id> --source <sha>` (on CONFLICT or CHECKS_FAILED
  fix within the task files, then `integration:continue --id <id>`). Run
  QUALITY and delivery yourself; never implement work or DOCS tasks in main.
- **executor** (assignment worktree): `assignment:attach <id>`, then
  `task:start`, work only within the task files, `commit --task`, reply
  with the SHA. Never touch main, the plan or other tasks; no nested
  executors, no push.
- Never set the git identity (`git config user.*`). If a command refuses
  with `GIT_IDENTITY_REQUIRED`, report it to the user with the command it
  prints.

### One task, one commit, one turn
1. `scripts/workflow task:start <ID>`; a delivery task needs
   `--confirmed "<the user's confirmation>"`.
2. Implement the task within its files and acceptance criteria.
3. `scripts/workflow commit --task <ID>`. The DOCS task of a round
   reconciles shared documents and needs `--digest <file.json>`
   (`result`, `decisions`, `contracts`, `references`).
4. If a check fails, fix the cause and repeat the same command; your edits
   are kept.
5. Report the result briefly and end the turn. The user or the Harness
   autopilot starts the next task.
- If the task cannot be finished in this turn, stop at a safe point, name
  the state and end the turn without committing it.
- A new user message does not cancel the accepted instruction; take it into
  account within the current task.

### Rules
- Never commit with `git commit` directly and never use `--no-verify`.
- Never edit the plan, `.harness/workflow/**` or the launchers by hand.
- A finished task never changes. Defects found later become a fixes round:
  `scripts/workflow plan:extend --input <file.json> --expected-revision <N>`.
- Before the first functional code, the QUALITY task chooses checks with
  `quality:detect` and applies them with `quality:apply --input <file.json>`.
  Installing tools needs the user's approval in `approval`.
- Update the contract document of a module in the same commit as its code
  (`docs.contracts` in `.harness/workflow/config.json`).
- Acceptance (`accept --note "<the user's words>"`) records the user's
  decision. Closing the scope (`close`) needs a separate direct user command.
- Build, packaging, publishing and push happen only in delivery tasks.
- If the scope is BLOCKED, only discuss and diagnose; run `task:unblock`
  after the user resolves the reason.
- If a command reports an unfinished transaction, run
  `scripts/workflow repair` and follow it.
- Use `scripts/workflow show-task <ID>` and `scripts/workflow history` for
  details the recovery packet left out.
<!-- workflow-kit:end -->
