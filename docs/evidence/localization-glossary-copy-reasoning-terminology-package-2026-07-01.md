# Glossary Copy And Reasoning Terminology Package Evidence - 2026-07-01

## User Report

Two items (chat, 2026-07-01):

1. The user confirmed the glossary helper text example terms are stale
   CodeAI Hub reference-app vocabulary that no longer matches the actual
   seeded terms.
2. The user asked what "assistant bubble" / "Reasoning bubbles" mean in two
   Settings description strings, noting that a generic machine translator
   renders "bubble(s)" literally as Russian "пузыри" (soap bubbles), which
   reads confusingly out of context.

## Change

In `source-dictionaries.ts`:

- `settings.localization.glossary.prefilled` now lists real example terms
  drawn from `SEEDED_PRESERVE_TERMS` (`Harness AI, CodeAI Hub, Project
  Manager, Claude`) instead of the stale CodeAI Hub reference examples
  (`Project Manager, Description, CODEX_HOME, questionnaire.md`).
- Reworded three approved strings that used "bubble(s)" — the "Reasoning"
  localization category description, the Claude thinking dialog description,
  and the OpenCode reasoning dialog description — to "message(s)" instead.
  "Bubble" is UI-implementation jargon for a chat message's rounded visual
  container, not user-facing terminology the description needs to preserve;
  "message" carries the same meaning and translates naturally into Russian,
  avoiding the literal, confusing "пузыри".

This is a pure copy/text-content fix with no behavior or contract change
(`[skip-docs]` on the commit).

## Verification

- Commit `c344c70` passed the implementation gates: `plan:validate`,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, and `npm test`.
- `npm run package:mac` passed.
  - `release/mac-arm64/Harness AI.app` exists.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was
    rebuilt at `2026-07-01T18:31:41Z`.
