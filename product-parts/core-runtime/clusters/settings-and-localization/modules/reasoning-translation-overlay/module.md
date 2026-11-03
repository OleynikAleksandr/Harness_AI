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
session sidecar directory, including the translated source text for new records.
The facade also exposes `deleteSessionOverlays(workspacePath, sessionId)`,
which removes the persisted overlay JSONL of one session; the Core session
delete cascade calls it for every session in a deleted tree so no orphan
sidecars remain.
`ReasoningTranslationOverlayProjector` applies translated overlays whose stored
source hash still matches the current message text, and keeps the latest
translated prefix visible while a growing reasoning message is waiting for its
next translation.

Every finished translation settles its message with one patch
(`translateVisibleReasoningMessage` / `publishDisplayMessages`): a successful
translation carries `localizedContent`; a failed one (`fallback`, e.g. an
OpenRouter `non_ok_response`) carries no `localizedContent`, so clients leave
the pending state and show the source reasoning instead of an empty Thinking
block. Both outcomes are still recorded in the overlay sidecar.

The translation engine set is rebuilt per translate call from the settings
snapshot's `openRouter` config (via `createProviderTranslationEngines`) rather
than fixed once at construction, so a saved OpenRouter reasoning translation
model takes effect immediately when `reasoningEngineId` selects it — without
requiring a Core restart. An explicit `translationFacade` passed to the
constructor (test seam) always takes priority over this per-call resolution.

## Inputs

- Visible reasoning/thinking text.
- Settings localization snapshot with reasoning language, reasoning engine
  selection, and the OpenRouter connection/profile config needed to resolve a
  configured OpenRouter reasoning translation engine.

## Outputs

- Translated reasoning overlay.
- Translation pending/error state; a settle patch for every finished
  translation (without `localizedContent` when it failed).
- Source hash used by later projection to ignore stale overlays.
- Prefix-stable projection for growing reasoning streams.

## Owned Paths

- `module.md`
- `src/**`
