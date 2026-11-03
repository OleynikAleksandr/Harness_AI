# Workflow Installer Module

## Responsibility

Everything the Workflow Kit writes into a project and keeps healthy there:
- the installation payload — the bundle, launchers, git hooks, agent rules,
  provider hooks, ignore and attribute sections, skeleton documents — and
  the manifest that records it.

Folder inspection, install and update, the project doctor and the
migration of legacy Harness plans are added by later tasks of the active
plan.

## Public Facade

`WorkflowInstallerFacade` (class, singleton `workflowInstallerFacade`).

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

## Dependencies

`workflow-platform` (launchers, bundle path, `WorkflowError`). Node built-ins
only.

## Tests

`src/workflow-installer-payload.test.mjs` — the file list, read-back and
idempotence of every managed part, byte-exact sections with CRLF, the
CLAUDE line, foreign provider hooks kept, invalid JSON, own and husky git
hooks, created files, gitignore and gitattributes, manifest hashes.
