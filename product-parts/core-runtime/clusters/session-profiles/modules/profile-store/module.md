# Profile Store Module

## Responsibility

Own the on-disk truth of user-editable session profiles: the
`~/.harness-ai/Profiles/**` root resolution (`HARNESS_AI_HOME` aware), the
profile directory layout (one directory per profile with exactly three
documents: `profile.yaml` passport, `system-prompt.md` prompt body,
`tooling.yaml` tooling categories), and the shared profile type model
(universal vs individual scope via the optional passport `provider` field,
tooling category vocabulary v1).

Scanning/parsing/validation and first-access seeding are the next micro
tasks of the active plan for this module; this module currently exposes the
storage layout contract and the type model only.

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

## Owned Paths

- `module.md`
- `src/**`
