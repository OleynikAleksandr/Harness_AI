# Profile Studio Settings UI Module

## Responsibility

Render the infrequently changed, application-wide Profile Studio defaults in
Settings rather than in the everyday profile creation workflow.

## Public Facade

`ProfileStudioSettingsUiFacade`

## Inputs

- Core-owned `profileStudio.defaultCreatorAgentProviderId` settings value.
- Core-owned managed Profile Creator Agent option catalog.

## Outputs

- Default Profile Creator Agent provider selection intent. The first available
  value is `codex`; its catalog label is `Codex Profile Creator Agent` and its
  execution identity is fixed to GPT-5.6 Sol / high.
- Exact provider, model and reasoning metadata for the selected managed option.

The facade edits only the Settings draft passed by the parent surface. Normal
Settings Save persists the selection through Core; the module does not own
persistence or compose provider/model/reasoning combinations.

## Owned Paths

- `module.md`
- `src/**`
