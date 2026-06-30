# Reasoning Translation Overlay Module

## Responsibility

Own async translation decisions and overlay payloads for visible
reasoning/thinking content without rewriting the canonical source transcript.
Translated overlays are persisted as session sidecar JSONL records.

## Public Facade

`ReasoningTranslationOverlayFacade` resolves reasoning translation policy from
the Settings localization snapshot, marks eligible visible reasoning as
`translationState: "pending"`, hashes the source text, and dispatches the
translation request through Provider Runtime translation engines.
`ReasoningTranslationOverlayStore` appends overlay records under the workspace
session sidecar directory, and `ReasoningTranslationOverlayProjector` applies
only translated overlays whose stored source hash still matches the current
message text.

## Inputs

- Visible reasoning/thinking text.
- Settings localization snapshot with reasoning language and reasoning engine
  selection.

## Outputs

- Translated reasoning overlay.
- Translation pending/error state.
- Source hash used by later projection to ignore stale overlays.

## Owned Paths

- `module.md`
- `src/**`
