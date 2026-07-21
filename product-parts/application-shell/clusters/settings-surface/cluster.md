# Settings Surface Cluster

## Boundary

Owns settings UI for providers, Profile Studio defaults, localization,
reasoning translation and recovery controls. Session profile authoring remains
in the separate Profile Studio application mode; the ordinary new-session
picker remains in `session-interface`.

## Owned Modules

- `provider-settings-ui`
- `profile-studio-settings-ui`
- `localization-settings-ui`
- `recovery-controls-ui`

## Facade Rule

Settings UI renders Core-owned settings snapshots and emits settings intents; it does not own persistence truth.
