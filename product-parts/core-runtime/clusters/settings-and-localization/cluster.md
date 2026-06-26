# Settings And Localization Cluster

## Boundary

Owns settings persistence, UI localization runtime, and visible reasoning/thinking translation.

## Owned Modules

- `settings-store`
- `localization-runtime`
- `reasoning-translation-overlay`

## Facade Rule

Provider-backed translation engines are called through Provider Runtime; Core owns policy and rendered state.
