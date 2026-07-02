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
`todo-plan-deterministic`, `review`, `architecture-spec`) plus the three
individual migration profiles (`codeai-workflow-claude` from the hardcoded
Claude workflow prompt, `codeai-workflow-kimi` from the managed-agent
`system.md` content including the gzip-embedded Codex-native baseline copy,
`codeai-workflow-glm-native` from the static part of the built-in GLM
instruction). Seeding runs only when the root contains no profile
directories at all; user files are never overwritten and deleting a single
seeded profile does not resurrect it.

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

## Owned Paths

- `module.md`
- `src/**`
