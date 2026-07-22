# Profile Studio Read Model Module

## Responsibility

Own renderer-safe Profile Studio truth. `listTargets()` exposes only Claude,
Codex and Kimi with model ids/labels from `ProviderDescriptorFacade` (Kimi
uses its live-verified client catalog). `listProfilesForTarget()` projects the
exact provider/model Studio-only catalog, including creator-session binding;
there is no Native or legacy row.

`getInspector()` composes the three accepted tabs from Core data:

- Overview: exact target, purpose, Draft/Valid, content hash, creator session,
  structured target identity, «Основан на Native Capture …» provenance and
  Core-derived approval readiness;
- Custom System Prompt: stored Native foundation, stored Custom additions and
  deterministic compiled prompt;
- Custom System Tools: selected structured tools and provider capability mode.

Capability truth is explicit: Claude has an editable native subset; Codex
shows the stored captured inventory as declarative-only/read-only while its
app-server runtime tools remain fixed; Kimi is candidate/Draft-only. Kimi's blocker is
computed from the current universal built-in tool source (currently 9) against
the captured Native ceiling (25), displayed as `9/25`; renderer code does not
count tools or infer readiness.

Approval readiness requires both prompt parts and a bound, authoring-validated
Native Capture donor. Kimi remains blocked independently. The renderer only
submits the exact content hash when Core says the current Draft can be
approved.

## Public Facade

`ProfileStudioReadModelFacade`

## Inputs

- Provider descriptor, Studio catalog/lifecycle, profile store/materializer
  and universal built-in tool-source public facade contracts.
- Optional exact target or profile id.

## Outputs

- Three provider/model target groups.
- Compatible Studio profile/session rows.
- `ProfileStudioInspectorSnapshot` for Overview, Prompt and Tools tabs.

## Owned Paths

- `module.md`
- `src/**`
