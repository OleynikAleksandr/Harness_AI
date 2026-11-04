# Workflow Installer Module

## Responsibility

Everything the Workflow Kit writes into a project and keeps healthy there:
- the installation payload — the bundle, launchers, git hooks, agent rules,
  provider hooks, ignore and attribute sections, skeleton documents — and
  the manifest that records it;
- folder inspection, install and update;
- the project doctor and its safe fixes;
- the migration of legacy Harness plans (`harness-ai-plan-v1`).

## Public Facade

`WorkflowInstallerFacade` (class, singleton `workflowInstallerFacade`). The
constructor takes a `WorkflowGitFacade`.

## Payload (`installer-payload.ts`)

`payload({projectName, bundle, hooksPath})` returns one entry per file:
`{path, kind, executable, managed, render(current), read(current)}`.
`render` turns the current text (`null` when the file is absent) into the
new text; `read` returns the managed part of a text, so the doctor can
compare it with `managed`.

| Path | Kind | Content |
|---|---|---|
| `.harness/workflow/runtime/workflow.mjs` | owned | the Kit bundle |
| `scripts/workflow` (executable), `scripts/workflow.cmd`, `scripts/workflow.ps1` | owned | launchers of `workflow-platform` |
| `.harness/workflow/hooks/<hook>` (executable) | owned | when `core.hooksPath` is not set |
| `<hooksPath>/<hook>` (executable) | section, after the shebang | when `core.hooksPath` is set (Harness: `.husky`) |
| `AGENTS.md` | section | English process rules |
| `CLAUDE.md` | line | `@AGENTS.md`, appended once |
| `.codex/hooks.json` | json | SessionStart → `scripts/workflow hook session-start --client codex` |
| `.claude/settings.json` | json | SessionStart → `"$CLAUDE_PROJECT_DIR/scripts/workflow" hook session-start --client claude` |
| `.gitignore` | section | `.harness/workflow/local/`, `.harness/runtime/` |
| `.gitattributes` | section | `eol=lf` for the POSIX launcher and `.harness/**`, `eol=crlf` for `.cmd` and `.ps1` |
| `README.md`, `docs/architecture/OVERVIEW.md` | create | skeletons, only when absent |

Hooks are `pre-commit`, `commit-msg`, `post-commit`, `pre-push`; each
managed block runs
`"$(git rev-parse --show-toplevel)/scripts/workflow" git-hook <name> "$@" || exit $?`.

Writing rules:
- **section** — the block between `workflow-kit:begin` and
  `workflow-kit:end` (`<!-- … -->` in Markdown, `# …` elsewhere) is
  replaced or added; the rest of the file stays byte for byte, CRLF files
  keep CRLF. New blocks go to the end, git hook blocks after the shebang
  (a missing hook file starts with `#!/bin/sh`).
- **json** — every SessionStart group whose command runs
  `scripts/workflow … hook session-start` is replaced by the one Kit group;
  other hooks and settings stay. A file that is not a JSON object fails with
  `MANAGED_JSON`.
- **line** — `@AGENTS.md` is appended when no line equals it.
- **create** — an existing file is never touched.
- Rendering is idempotent.

## Manifest

`manifest(entries)` → `{schema "harness-workflow-manifest/1", version,
files: [{path, kind, executable, sha256}]}`; `sha256` hashes the managed
part (`null` for `create`). `version` is `KIT_VERSION` (`2.0.0`; Kit 1.x
was Workflow Pilot). The manifest lives at `.harness/workflow/manifest.json`
(`manifestPath`).

## Inspection (`installer-inspect.ts`)

`inspect(path)` changes nothing and returns `{path, state, action, git
{repository, identity, head}, stacks, transactionPending, version, damaged,
nestedIn}`. States in order of detection:

| State | Condition | Action |
|---|---|---|
| `MISSING` | the folder does not exist | `create` |
| `EMPTY` | no entries | `install` |
| `PILOT_KIT` | `.harness/kit-manifest.json` (Workflow Pilot) | `unsupported` |
| `KIT_OUTDATED` | manifest version older than `KIT_VERSION` | `update` |
| `KIT_DAMAGED` | a managed part differs from its manifest hash (`damaged`) | `doctor` |
| `KIT_OK` | manifest current and every managed part intact | `open` |
| `LEGACY_HARNESS_PLAN` | the plan file is `harness-ai-plan-v1` | `install-migrate` |
| `GIT_NO_KIT` | repository top level without the Kit | `install` |
| `NOT_GIT` | files without a repository | `install` |

A folder inside another repository (not its top level, compared by real
path) reports `nestedIn` and action `unsupported`.

## Install And Update (`installer-install.ts`)

`install(path, {bundle, name?, update?, runtime?})`:
1. refuses `NESTED_REPOSITORY`, `PILOT_KIT_UNSUPPORTED`,
   `TRANSACTION_PENDING`, `ALREADY_INSTALLED` (without `update`) and
   `NOT_INSTALLED` (with `update`); without a git identity it stops with
   `GIT_IDENTITY` before writing anything;
2. creates the folder and runs `git init` (branch `main`) when needed;
3. reads the local `core.hooksPath`: a path inside the project gets hook
   sections; none means own hooks in `.harness/workflow/hooks` and
   `core.hooksPath` set to it; a path outside fails with
   `HOOKS_PATH_OUTSIDE`;
4. writes every payload entry whose text changes (executable entries get
   mode 755 on POSIX), an empty plan (`projectId` is the slug of `name`,
   default the folder name) and the default configuration when they are
   absent, and the manifest;
5. records `runtime` (`.harness/workflow/local/runtime`) so the launchers
   and hooks find Node or Electron;
6. commits the written files through a Kit transaction: role `bootstrap`
   (`chore: install workflow kit <version>`) or `kit-update`
   (`chore: update workflow kit to <version>`). The installed hooks already
   run for this commit. Nothing to commit gives `commit: null`.

The result is `{root, previousState, version, hooksPath, written, excluded,
migrationRequired, commit}`; `excluded` lists earlier changes left out of
the commit. A legacy Harness plan is kept unchanged with
`migrationRequired: true`. Plan and configuration of an installed project
are never overwritten.

## Doctor (`installer-doctor.ts`)

`doctor(path, {env?, probe?, fix?})` returns `{root, ok, checks, fix}`.
Each check is `{id, status ok|warn|fail, message, fixable, nextAction}`:

| Id | Fails when | Fixable |
|---|---|---|
| `manifest` | the manifest is missing, or older than `KIT_VERSION` | when older |
| `managed-files` | a managed part differs from its manifest hash or is missing | yes |
| `executable` | an executable launcher or hook lost its mode (POSIX only) | yes |
| `git-hooks` | the local `core.hooksPath` is unset, or a hook there lacks the Kit section | yes |
| `plan` | the plan is missing, unreadable or disagrees with the history | no (`repair`) |
| `transaction` | a commit transaction is unfinished | no (`repair`) |
| `runtime` | no Node.js 22+ runtime for the launchers (`probe` injectable) | no |
| `git-identity` | git has no user identity | no |
| `quality-drift` | `warn` when detected stacks and the profile differ | no |

`ok` is true when no check fails. With `fix: {bundle, runtime}` and a
fixable failure, the doctor runs `install --update`: it rewrites owned
files and sections, restores `core.hooksPath` and modes, and commits with
role `kit-update` when the files differ from HEAD (otherwise
`fix.commit` is `null`). Plan, configuration and user text are never
changed. The checks then run again.

## Legacy Plan Migration (`installer-legacy-plan.ts`, `installer-migrate.ts`)

`migrateHarnessPlan(path, {now, message?, objective?, acceptance?, spec?,
name?})` needs an installed Kit (`NOT_INSTALLED`) and a plan with the
`harness-ai-plan-v1` state block (`NOT_LEGACY_PLAN`).

Parsing:
- the JSON state block gives `planId`, `executionScopeStatus` and
  `currentTaskId`;
- task rows are `N. [STATUS] \`<id>\` <text> (scope: …; expected commit:
  \`…\`[; completion: …])`, with indented continuation lines joined;
  `Git Commit:` rows are skipped; `(kind: quality|docs|delivery)` marks
  the kind; the title is the text before the first `(scope:`, `(kind:` or
  `(completion:`; the phase heading is kept;
- backtick `.md`/`.json` paths of the `## Context Pack` section.

The new plan:
- a row is finished when it is `DONE` or when its expected commit equals
  the migration commit message (the row the migration itself closes);
- finished rows become the digest of the closed round `R0-legacy` (kind
  `legacy`): count and first and last ids in `result`, and
  `git show <baseline>:.harness/plans/todo-plan.md` in `references`;
- the remaining rows become round `R1` in their order: work tasks
  (`kind: quality` keeps `quality`), then `DOCS-R1` depending on all of
  them, then delivery tasks depending on `DOCS-R1`. A `kind: docs` row
  becomes `DOCS-R1` (its title and commit message); a
  `completion: user-acceptance` row is dropped because acceptance is the
  `accept` command. Both conversions are recorded as scope decisions;
- tasks keep their ids and expected commit messages; `why` names the phase
  and the legacy scope; `files` start empty;
- scope id is the legacy `planId`, baseline is HEAD before the migration,
  context lists existing context-pack paths (not required);
- a legacy plan without an active scope, or without remaining work,
  becomes an empty Kit plan.

The plan is validated and committed with role `kit-update` and the given
message (default `chore: migrate the plan into the workflow kit`). The old
plan stays readable in the parent commit. The result is `{scopeId,
legacyDone, migrated, converted, commit}`.

## Dependencies

- `workflow-platform` — launchers, bundle and runtime paths, files.
- `workflow-git` — repository, identity, hooks path, transaction.
- `workflow-plan` — the empty plan and plan path.
- `workflow-quality` — the default configuration and stack detection.

Node built-ins only.

## Tests

- `src/workflow-installer-payload.test.mjs` — the file list, read-back and
  idempotence of every managed part, byte-exact sections with CRLF, the
  CLAUDE line, foreign provider hooks kept, invalid JSON, own and husky git
  hooks, created files, gitignore and gitattributes, manifest hashes.
- `src/workflow-installer-install.test.mjs` — every folder state, missing
  identity, a new project with the installed hooks rejecting a direct
  commit, damage and outdated detection with update, existing files kept,
  husky sections, a legacy plan kept for migration, Workflow Pilot and
  nested folders refused.
- `src/workflow-installer-doctor.test.mjs` — a healthy installation, fixable
  breakage (mode, section, hook, hooks path) repaired without touching the
  plan, a missing runtime, quality drift, a pending transaction, a missing
  manifest.
- `src/workflow-installer-migrate.test.mjs` — a legacy fixture with done,
  in-progress, wrapped, quality, docs, delivery and acceptance rows: the
  migration commit, rounds, task mapping, digest, decisions, context, a
  working Kit plan afterwards, and an idle legacy plan.

Test repositories get a real repository-local identity
(`workflow@harness-ai.test`; install tests through `GIT_TEMPLATE_DIR`),
because Kit commits refuse placeholder identities
(`GIT_IDENTITY_REQUIRED`).
