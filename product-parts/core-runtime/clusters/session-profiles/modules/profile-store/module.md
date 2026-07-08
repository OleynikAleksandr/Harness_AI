# Profile Store Module

## Responsibility

Own the on-disk truth of user-editable session profiles: the
`~/.harness-ai/Profiles/**` root resolution (`HARNESS_AI_HOME` aware), the
profile directory layout (one directory per profile; universal profiles live
directly under `Profiles/`, provider-scoped profiles may live under a namespace
such as `Profiles/Codex/<profileId>/` or `Profiles/CodexUC/<profileId>/` while
keeping the same profile id; the namespace is not part of the id, so duplicate
ids across namespaces are invalid product data), and the shared profile type model
(universal vs individual scope via the optional passport `provider` field,
tooling category vocabulary v1).

The module scans the profiles root, parses and validates the required profile
documents (`profile.yaml`, `system-prompt.md`, and `tooling.yaml` for every
profile except Codex app-server; `profile-document-parser.ts`, backed by the
`yaml` package), plus optional native request sidecars
(`custom-instructions.md`, `request-template.json`, `tools.json`), returns valid profiles separately from human-readable
validation failures, and seeds the standard profile set on first access
(`src/seed/**`): four universal drafts (`plan-document`,
`todo-plan-deterministic`, `review`, `architecture-spec`), the active Claude
individual migration profile (`codeai-workflow-claude` from the hardcoded
Claude workflow prompt), and the Codex provider-scoped profiles
`codex-app-server-synthetic-native` and
`codex-app-server-synthetic-native-custom` under `Profiles/Codex`, plus the
CodexUC provider-scoped profiles `codex-synthetic-native` and
`codex-synthetic-native-custom` under `Profiles/CodexUC`. The CodexUC profiles
preserve the accepted native request capture as a native bundle: captured
`body.instructions` in `system-prompt.md`, captured `body.tools` in
`tools.json`, and static request fields in `request-template.json`. The
current structured tool sidecar is synchronized from the Codex app-server
Native Request Capture
`2026-07-08T05-52-03-626Z-codex-gpt-5.5-native-request.jsonl`. The Codex
app-server profiles keep the same prompt baseline but do not store
`tooling.yaml`, `request-template.json`, or `tools.json`, because app-server
owns both the category/tooling gate and structured tool surface outside the
profile. Custom variants add only
`custom-instructions.md`; the prompt file remains the captured baseline and
must not pre-merge the custom text. Native-bundle materialization is
responsible for inserting the sidecar into the final provider-facing
`instructions`, and CodexUC is responsible for adding its runtime
`prompt_cache_key` to the HTTP request after structured `tools`.
`request-template.json` stores stable captured request fields, not a cached
runtime key. The same storage invariant applies to every profile directory:
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
  `tooling.yaml` when profile-owned, plus optional `custom-instructions.md`,
  `request-template.json`, `tools.json`).
- Shared session profile type model: passport (name, description, optional
  `provider`), tooling category vocabulary v1 (`file-read`, `file-write`,
  `shell`, `web`, `git`, `tests`), profile scope (`universal` |
  `individual`).
- Scanned profile list: valid `SessionProfile` entries (passport, prompt
  body, normalized profile-owned tooling categories or the Codex app-server
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
