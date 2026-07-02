# Settings Surface Cluster

## Boundary

Owns settings UI for providers, localization, reasoning translation, recovery controls, and session profile management.

## Owned Modules

- `provider-settings-ui`
- `localization-settings-ui`
- `recovery-controls-ui`
- `profile-settings-ui`

## Facade Rule

Settings UI renders Core-owned settings snapshots and emits settings intents; it does not own persistence truth.
