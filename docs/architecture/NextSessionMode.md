# Next Session Mode

## Decision

`Next Session Mode` is a Core-owned session creation contract with an Application Shell display surface. The current active runtime mode is only `Native · Raw`.

## Current Behavior

- Application Shell shows `Next Session Mode` in the left sidebar.
- The settings panel renders managed and normalized options as preview-only labels.
- Session creation submits the native raw baseline.
- Core resolves any received next-session mode input to `Native · Raw`.
- Provider Registry exposes invocation profile descriptors for display/read-model use, not provider dispatch.

## Authority Boundary

UI does not choose provider behavior. It may submit the user's visible selection and render Core/provider descriptor snapshots, but validation, defaults, and runtime application belong to Core Runtime or shared provider contracts.

Managed profile execution and request normalization remain future Core work. Until that contract is explicitly enabled, native provider startup receives the raw user request.
