# Localization Glossary Open-File Package Evidence - 2026-07-01

## User Report

Clicking "Open glossary file" in Settings > General > Glossary protection
showed a native "Path does not exist" alert instead of opening the
do-not-translate glossary in VS Code.

## Root Cause

`openGlossary()` in `settings-surface-facade.tsx` built
`${workspacePath}/.harness/settings/localization-glossary.txt` — a path
inside the user's open project workspace that was never written by any code
path. The real glossary lives at Core-resolved
`<harnessHome>/Localization/glossary/do-not-translate-terms.txt`. Separately,
`UserGlossaryStore.ensureEditableGlossaryFile()` (which creates the file with
seeded do-not-translate terms on first use, matching the Settings copy) was
already implemented but never called from any production code path, and no
IPC/RPC bridge existed to reach it from the renderer at all.

## Change

- Added a Core RPC `ensure-glossary-file` (`core-glossary-rpc.ts` +
  `core-runtime-api.ts` in `core-runtime-process`) that creates the glossary
  file with seeded terms if missing and returns its real path.
- Forwarded the RPC end-to-end: `IPC_TO_RPC` map in
  `core-process-bridge-facade.mjs`, `window.harnessCore.ensureGlossaryFile()`
  in `preload.cjs`, and its type in `vite-env.d.ts`.
- `openGlossary()` now calls `ensureGlossaryFile()` first and opens the real
  returned path in VS Code, surfacing failures through the existing Settings
  status line instead of a native alert. The component's `workspacePath` prop
  was dropped (its only use was the fabricated path) along with the prop pass
  in `session-window-facade.tsx`.
- Glossary protection itself was already wired into translation
  (`materializeCoreLocalizationRuntimePayload` -> `GlossaryProtector`); it was
  inert only because the file never existed, so this fix is what makes the
  "Glossary protection" toggle have an effect for the first time.

## Out Of Scope

The UI source string `settings.localization.glossary.prefilled` describes
example seed terms ("Project Manager, Description, CODEX_HOME,
questionnaire.md.") that do not match the actual `SEEDED_PRESERVE_TERMS` in
`user-glossary-store.ts` ("Harness AI, CodeAI Hub, Project Manager, Claude,
Codex, VS Code, TypeScript, Markdown"). Flagged to the user; not fixed in this
cycle.

## Verification

- Commits `fb8e64b`, `bcd4647`, `27d9d6e` each passed the implementation
  gates: `plan:validate`, `check:architecture`, `lint`, `check:knip`,
  `typecheck`, and `npm test`.
- `npm run package:mac` passed.
  - `release/mac-arm64/Harness AI.app` exists.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was
    rebuilt at `2026-07-01T17:36:13Z`.
