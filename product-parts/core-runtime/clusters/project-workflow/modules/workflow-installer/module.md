# Workflow Installer Module

## Responsibility

Everything the Workflow Kit writes into a project and keeps healthy there:
- the installation payload — the bundle, launchers, git hooks, agent rules,
  provider hooks, ignore and attribute sections, skeleton documents — and
  the manifest that records it;
- folder inspection, install and update.

The project doctor and the migration of legacy Harness plans are added by
later tasks of the active plan.

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
