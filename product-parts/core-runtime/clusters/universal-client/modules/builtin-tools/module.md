# Built-in Tools Module

## Responsibility

Own the universal client's built-in tool source: the descriptors (name +
JSON Schema) and executors for the MVP tool set, registered into the tool
registry as the `builtin` source. It covers the MVP tool set: file/exec/search
(`read_file`, `write_file`, `edit_file`, `apply_patch`, `exec_command`,
`grep_files`, `glob_files`) plus web (`web_search`, `web_fetch`) and shared
output truncation. Executors validate paths against the workspace root, run
processes with a timeout and output cap, and return the registry's
`ToolExecutionResult`; any failure becomes a tool error (reported to the model,
not fatal to the turn). Behavior ported from the reference glm-native tool
executors; MCP/skills are separate future sources, not here.

Contract source: `docs/architecture/UniversalClient.md` (section 3.2).

## Public Facade

`builtin-tools-facade.ts`

## Inputs

- A tool call (`qualifiedName`, `argumentsJson`) and a `ToolExecutionContext`
  (workspace path + optional abort signal) from the registry.

## Outputs

- `createBuiltinToolSource()` -> a `ToolSourceProvider` (`source: "builtin"`)
  whose `list()` returns the built-in descriptors and whose `execute` parses
  arguments, dispatches to the owning part, and wraps failures as tool errors.
- `builtin-tools-file-exec-search.ts`: `FILE_EXEC_SEARCH_DESCRIPTORS` and
  `executeFileExecSearchTool` (read/write/edit/apply_patch/exec/grep/glob;
  returns null for tools it does not own so a sibling part can handle them).
- `builtin-tools-shared.ts`: argument parsing, workspace-path validation
  (rejects escapes and parent segments), numeric clamping, output budget.
- `builtin-tools-process.ts`: `runShell` / `runProcess` with a timeout and an
  output-char cap.
- `builtin-tools-patch.ts`: `applyBuiltinPatch` for the Codex-style
  `*** Begin Patch` envelope.
- `builtin-tools-web.ts`: `WEB_DESCRIPTORS` and `executeWebTool` (`web_fetch`
  readable-text extraction; `web_search` via DuckDuckGo HTML).
- `builtin-tools-truncate.ts`: `truncateOutput` caps a result at a char budget
  with an inline `...[truncated]` marker (the OpenCode-style on-disk full-output
  pointer is a future addition, not required for the client four).

## Owned Paths

- `module.md`
- `src/**`
