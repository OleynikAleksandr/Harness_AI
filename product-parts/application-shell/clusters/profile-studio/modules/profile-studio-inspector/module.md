# Profile Studio Inspector Module

## Responsibility

Present one Core-owned Profile Studio inspector snapshot beside the ordinary
creator session surface.

## Public Facade

`ProfileStudioInspectorFacade`

## Tabs

- `Overview`: purpose, exact target, Native Capture donor provenance,
  lifecycle identifiers and exact-hash approval action.
- `Custom System Prompt`: read-only reduced Native foundation and Custom
  additions.
- `Custom System Tools`: read-only provider ceiling, block reason and selected
  native descriptors.

`Components` and `Capture` are not tabs. Custom Capture remains an internal
creator-agent verification step. Profile text and tools cannot be edited in
this module; changes happen through the creator conversation. Approval sends
the exact Core-provided content hash and does not derive validity in the UI.

## Empty And Blocked States

- No selected profile produces an explicit empty inspector.
- Missing prompt parts are shown honestly rather than filled with samples.
- Provider-fixed tools and Kimi Draft-only limitations display Core-provided
  capability state.

## Owned Paths

- `module.md`
- `src/**`
