# Legacy Direct Provider Turn Runner Module

## Responsibility

Deprecated implementation debt. This module dispatches selected session turns directly to provider CLIs or HTTP APIs and bypasses the CodeAI Hub-style Core/provider adapter path.

Do not extend this module. It remains only until the Application Shell is rewired to Core-owned session dispatch and the provider adapters expose the shared adapter contract.
The GLM OpenCode direct runner entry has been removed as part of the GLM
migration; this legacy runner no longer searches `.opencode/bin` or dispatches
`glm-opencode`.

## Public Facade

`ProviderTurnRunnerFacade`

## Inputs

- Historical direct provider id.
- Historical selected model.
- Historical user prompt.

## Outputs

- Historical provider response text.
- Historical provider setup or runtime error text.

## Owned Paths

- `module.md`
- `src/**`
