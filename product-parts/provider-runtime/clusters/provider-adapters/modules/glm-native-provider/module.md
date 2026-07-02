# GLM Native Provider Module

## Responsibility

Harness-packaged GLM Native provider migrated from CodeAI-Hub.

The module owns the Harness facade and the embedded reference GLM native
runtime. The facade only binds Harness auth/settings, selected model, workspace
path and provider home path; request building, thinking controls, SSE parsing,
tool execution, session logging and GLM-specific usage limits come from the migrated
CodeAI-Hub module.
Provider home storage is Harness-owned: workspace sessions use
`<workspace>/.harness/runtime/providers/glm-native/home`, and non-workspace
fallbacks use `~/.harness-ai/providers/glm-native/home`.
The facade accepts an explicit `providerHomePath` for Core-owned global-home
liveness preflight without treating that global home as a workspace root.

## Public Facade

`GlmNativeProviderFacade`

## Inputs

- Provider turn request.
- GLM native auth/home configuration.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- GLM Native thinking and assistant stream events from the reference SSE parser.
- Runtime tool execution and session logs under Harness runtime provider home.
- `ensureWorkspaceHome(workspacePath)` creates the workspace GLM Native
  provider home without starting the runtime; auth remains owned by the
  provider auth store/settings boundary.
- `deleteSessionArtifacts(providerSessionId, workspacePath)` removes the GLM rollout
  log (`home/sessions/**/<providerSessionId>.jsonl`) for a removed session, leaving
  the shared provider home intact.

- Session profile application layer (`glm-native-profile-application.ts`):
  managed sessions build the system message from the frozen snapshot payload
  (same start date, same wrapper — never live data) plus the adapter-owned
  GLM tool contract for the category-filtered schema subset; native and
  legacy keep the built-in instruction with the full tool set (GLM Native's
  native IS the built-in client behavior). Applied details (`mode`,
  `profileId`, `contentHash`, `toolSchemaIds`) return to Core via
  `ProviderSessionStartResult`.
- Category mapping (categories only filter GLM's OWN tool schemas):
  `file-read` -> read_file, read_file_anchored, grep_files, glob_files,
  workspace_symbols, go_to_definition, find_references; `file-write` ->
  write_file, edit_file, edit_file_by_anchor, apply_patch,
  write_workflow_artifact; `shell` -> exec_command; `web` -> web_search,
  web_fetch, browser_fetch; `git` -> git_status, git_diff, git_log,
  git_blame; `tests` -> run_tests.
- `openGlmResponse` (single HTTP attempt) lives in
  `glm-native-adapter-utils.ts`, moved out of the adapter for the 500-line
  cap; the adapter owns the retry loop.

## Owned Paths

- `module.md`
- `src/**`
