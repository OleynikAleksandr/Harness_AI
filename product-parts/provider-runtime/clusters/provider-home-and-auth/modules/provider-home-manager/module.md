# Provider Home Manager Module

## Responsibility

Own isolated provider home layout.

## Public Facade

`ProviderHomeManagerFacade`

## Inputs

- Provider id.
- Workspace/user home policy.

## Outputs

- Provider home paths.
- Home preparation diagnostics.
- CLI-free provider home file materialization by copy-if-missing or link for
  provider-owned workspace provisioning.
- Codex provider-home `model_reasoning_summary = "detailed"` materialized at top-level TOML scope. Provider-home config is process-global and must not suppress visible reasoning summaries requested per turn by Core/provider turn options.
- `removeWorkspaceResidue(workspacePath, providersRoot?)`: when a project is
  removed from the app (Core `remove-workspace`), deletes the per-project
  directories the app-level provider homes
  (`~/.harness-ai/providers/<provider>/home`) keep for that path —
  `.claude/projects/<slug>` and `Library/Caches/claude-cli-nodejs/<slug>`,
  where `<slug>` is the path with every non-alphanumeric character replaced
  by `-` (Claude CLI rule). Workspace-local homes inside the project folder
  are not touched. Returns the removed directories; a relative path removes
  nothing.
- `withRealGitConfig(environment, realHome = os.homedir(), fileExists =
  fs.existsSync)` (pure, exported from the facade file): agent processes run
  with `HOME` set to a provider home that has no `~/.gitconfig`, so git
  inside them lacks the user's identity. When `environment.HOME` is set and
  differs from `realHome`, `GIT_CONFIG_GLOBAL` is not set and
  `<realHome>/.gitconfig` exists, it returns a copy of the environment with
  `GIT_CONFIG_GLOBAL=<realHome>/.gitconfig`; otherwise it returns the same
  environment object. XDG variables are not touched. Callers: the Claude
  auth environment (`getAuthEnvironment()`) and the Kimi ACP child spawn;
  Codex and Grok do not override `HOME`.

## Owned Paths

- `module.md`
- `src/**`
