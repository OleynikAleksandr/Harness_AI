# Profile Studio Cluster

## Boundary

Owns the Application Shell presentation of provider/model-scoped Profile
Studio. It renders only typed Core targets, compatible profile rows and
inspector snapshots; lifecycle, authoring, capability and persistence truth
remain in Core Runtime.

## Owned Modules

- `profile-studio-sidebar`
- `profile-studio-inspector`

The `profile-studio-shell` composition module is added by the next active-plan
slice. Until then these two facades are not mounted in the application window.

## Facade Rule

The renderer passes snapshots and raw user intents through facade props. These
modules never scan profile or capture files, compile prompts, infer provider
capabilities or parse creator-agent output.
