# Profile Store Module

## Responsibility

Own the on-disk truth of user-editable session profiles: the
`~/.harness-ai/Profiles/**` root resolution (`HARNESS_AI_HOME` aware), the
profile directory layout (one directory per profile with exactly three
documents: `profile.yaml` passport, `system-prompt.md` prompt body,
`tooling.yaml` tooling categories), and the shared profile type model
(universal vs individual scope via the optional passport `provider` field,
tooling category vocabulary v1).

The module scans the profiles root, parses and validates the three documents
of every profile directory (`profile-document-parser.ts`, backed by the
`yaml` package), returns valid profiles separately from human-readable
validation failures, and seeds the standard profile set on first access
(`src/seed/**`): four universal drafts (`plan-document`,
`todo-plan-deterministic`, `review`, `architecture-spec`), the active Claude
individual migration profile (`codeai-workflow-claude` from the hardcoded
Claude workflow prompt), and the Codex `codex-synthetic-native` probe profile
materialized from the accepted native request capture plus the workspace
`AGENTS.md` text. The Codex probe prompt starts with the captured Codex system
prompt byte-for-byte, appends only a normal `AGENTS.md instructions` wrapper
containing the workspace instructions, and does not include Harness diagnostic
headings, captured/tool JSON code fences, or synthetic-profile explanatory
text. Real Codex tools remain app-server structured tools, not prompt text.
The same storage invariant applies to every profile directory:
`system-prompt.md` is provider-facing prompt payload, while provenance,
diagnostics, seed notes, and Harness metadata belong in `profile.yaml`, docs,
evidence, or sidecar artifacts, not inside prompt text.
Retired Kimi ACP and GLM Native provider ids are no longer seeded as selectable
profiles; their historical prompt material belongs to the Phase 5
synthetic-native design records, not active profile-store runtime code.
Seeding runs only when the root contains no profile directories at all; user
files are never overwritten and deleting a single seeded profile does not
resurrect it.

## Public Facade

`ProfileStoreFacade`

## Inputs

- Optional `profilesRootDirectory` override (defaults to
  `<harness home>/Profiles`, where harness home is `HARNESS_AI_HOME` or
  `~/.harness-ai`).
- Profile ids (kebab-case directory names).

## Outputs

- Resolved profiles root directory.
- Resolved per-profile document paths (`profile.yaml`, `system-prompt.md`,
  `tooling.yaml`).
- Shared session profile type model: passport (name, description, optional
  `provider`), tooling category vocabulary v1 (`file-read`, `file-write`,
  `shell`, `web`, `git`, `tests`), profile scope (`universal` |
  `individual`).
- Scanned profile list: valid `SessionProfile` entries (passport, prompt
  body, normalized tooling categories, scope, document paths) plus
  `SessionProfileValidationFailure` entries with human-readable issues
  (missing/unreadable file, invalid YAML, non-mapping top level, missing
  `name`, empty prompt body, unknown tooling category, non-boolean category
  value). Hidden directories are ignored; a missing root scans as empty.
- Tooling category values accept YAML booleans and `on`/`off`-style strings
  (the `yaml` package parses YAML 1.2, where bare `on`/`off` are strings);
  categories omitted from `tooling.yaml` default to `on` — unknown keys are
  errors so typos cannot silently disable a category.
- Profile change notifications: `watchProfiles(listener)` creates the
  profiles root when missing, starts a recursive `fs.watch` over it, and
  collapses bursts of file events (an editor save is several writes/renames)
  into one debounced notification so consumers rescan the catalog once per
  save. Watching is best-effort — an unwatchable root never crashes Core —
  and the returned unsubscribe closes the watcher and drops any pending
  notification.

## Owned Paths

- `module.md`
- `src/**`
