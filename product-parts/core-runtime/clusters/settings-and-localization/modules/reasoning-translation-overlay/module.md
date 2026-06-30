# Reasoning Translation Overlay Module

## Responsibility

Own async translation decisions and overlay payloads for visible
reasoning/thinking content without rewriting the canonical source transcript.

## Public Facade

`ReasoningTranslationOverlayFacade` resolves reasoning translation policy from
the Settings localization snapshot, marks eligible visible reasoning as
`translationState: "pending"`, hashes the source text, and dispatches the
translation request through Provider Runtime translation engines.

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
