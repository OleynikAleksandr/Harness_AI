# Profile Store Module

## Responsibility

Own the on-disk truth of user-editable session profiles: the
`~/.harness-ai/Profiles/**` root resolution (`HARNESS_AI_HOME` aware), the
profile directory layout (one directory per profile; legacy universal profiles
can still be read directly under `Profiles/`, while new provider-scoped
profiles may live under a namespace such as `Profiles/Codex/<profileId>/`
while keeping the same profile id; the namespace
is not part of the id, so duplicate ids across namespaces are invalid product
data), and the shared profile type model. That model now preserves legacy v1
universal/individual scope while also parsing the Studio v2 discriminated
passport (`schemaVersion: 2`, `authoring: profile-studio`, exact provider/model,
Draft/Valid status, creator-session binding and immutable Native Capture donor
provenance).

The module scans the profiles root, parses and validates the required profile
documents (`profile.yaml`, `system-prompt.md`, and `tooling.yaml` for every
profile except Codex app-server; `profile-document-parser.ts`, backed by the
`yaml` package), plus optional native request sidecars
(`custom-instructions.md`, `input-prefix.json`, `request-template.json`,
`tools.json`), returns valid profiles separately from human-readable validation
failures, and seeds the standard profile set on first access
(`src/seed/**`): only provider-scoped profiles are created. The seed set
contains the active Claude individual migration profile
(`codeai-workflow-claude` from the hardcoded Claude workflow prompt), the Codex
provider-scoped profiles
`codex-app-server-synthetic-native` and
`codex-app-server-synthetic-native-custom` under `Profiles/Codex`. The Codex
app-server profiles keep the same prompt baseline but do not store
`tooling.yaml`, `request-template.json`, or `tools.json`, because app-server
owns both the category/tooling gate and structured tool surface outside the
profile. Custom variants add only
`custom-instructions.md`; the prompt file remains the captured baseline and
must not pre-merge the custom text. Native-bundle materialization is
responsible for inserting the sidecar into the final provider-facing
`instructions`. The same storage invariant applies to every profile directory:
`system-prompt.md` is provider-facing prompt payload, while provenance,
diagnostics, seed notes, and Harness metadata belong in `profile.yaml`, docs,
evidence, or sidecar artifacts, not inside prompt text.
Universal first-access drafts are no longer seeded; existing universal
directories remain readable as legacy data for management surfaces.
Retired Kimi ACP and GLM Native provider ids are no longer seeded as selectable
profiles; their historical prompt material belongs to the Phase 5
synthetic-native design records, not active profile-store runtime code.
Seeding runs only when the root contains no profile directories at all; user
files are never overwritten and deleting a single seeded profile does not
resurrect it.

Studio v2 parsing is deliberately Draft-tolerant: a Draft with missing or empty
`system-prompt.md` and `custom-instructions.md` remains readable so the creator
conversation can progressively author it. A passport marked `valid` requires
both source parts to exist and contain text. Studio profiles use `tools.json`
and never require legacy `tooling.yaml`; malformed present JSON remains a
storage validation failure. The facade returns both prompt source parts
separately and does not compile them.

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
  `tooling.yaml` when profile-owned, plus optional `custom-instructions.md`,
  `input-prefix.json`, `request-template.json`, `tools.json`).
- Shared session profile type model: legacy passport (name, description,
  optional `provider`) or Studio v2 passport (exact provider/model,
  Draft/Valid, creator session and donor provenance), tooling category
  vocabulary v1 (`file-read`, `file-write`, `shell`, `web`, `git`, `tests`),
  profile scope (`universal` | `individual`).
- Scanned profile list: valid `SessionProfile` entries (passport, prompt
  body, separate custom-instructions body, normalized profile-owned tooling
  categories or the Codex app-server/Studio default category model,
  Draft-tolerant Studio source documents,
  default category model, optional native request bundle, scope, document paths) plus
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
