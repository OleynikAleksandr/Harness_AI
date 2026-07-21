# Profile Studio Storage Reset Package Evidence (2026-07-21)

User-authorized clean development reset before manually authoring the first
Codex Profile Creator Agent profile.

## Implemented Contracts

- Commit `6398db79` (`refactor: reset profile studio profile storage`):
  - target profiles resolve only below
    `~/.harness-ai/ProfileStudio/Profiles/**`;
  - catalog listing, loading and watching never seed profile content;
  - the previous hardcoded Claude/Codex seed sources and every seed call site
    are removed;
  - an empty target-profile root remains an empty Studio catalog.
- Commit `23385f5a` (`refactor: simplify creator agent provider setting`):
  - system settings persist only
    `profileStudio.defaultCreatorAgentProviderId: "codex"`;
  - the Core-owned option catalog maps `codex` to the visible label
    `Codex Profile Creator Agent` and fixed GPT-5.6 Sol / high execution
    metadata;
  - the redundant `codex-profile-creator-agent` id is absent from current
    Core and renderer contracts.

The target-profile catalog and Creator Agent profiles are deliberately
different roots:

```text
~/.harness-ai/ProfileStudio/
  Profiles/
  CreatorAgents/
    Codex/
```

No Creator Agent content has been placed in `CreatorAgents/Codex` yet. Its
composition is the next explicit design step, not a generated placeholder.

## Runtime Reset

The packaged application was stopped before the reset. The disposable legacy
root (116 KiB) and prior Profile Studio workspace/session state (72 KiB) were
moved to the recoverable macOS Trash location
`~/.Trash/HarnessAI-ProfileStudio-reset-20260721/` rather than deleted
irreversibly. Ordinary workspace sessions, settings, provider authentication
and Native Capture data were not touched.

After reset and before launch:

- `ProfileStudio/Profiles` existed and contained zero entries;
- `ProfileStudio/CreatorAgents/Codex` existed and contained zero entries;
- the old `~/.harness-ai/Profiles` and `ProfileStudio/workspace` paths no
  longer existed in the active runtime tree.

## Verification And Package Identity

Both implementation commits passed plan validation, architecture, Ultracite,
Knip, typecheck, docs-sync and `Tests: OK (146)`. Additional package checks
passed:

- duplication thresholds;
- production dependency audit: `0` vulnerabilities;
- documentation link check;
- production runtime and renderer build.

`npm run package:mac` rebuilt the unsigned macOS arm64 application from source
revision `23385f5a9b8b517c4b4040d4defbd4c3fe5e1c40`.

- application: `release/mac-arm64/Harness AI.app`;
- renderer: `/dist/renderer/assets/index-DHgZMIdB.js` and
  `/dist/renderer/assets/index-CpxuFWS7.css`;
- `app.asar` size: `32488594` bytes;
- `app.asar` modification time: `2026-07-21T17:34:41+0200`;
- SHA-256:
  `45c7c293a8249ee233c94c1893392dac0499da24983bbf7ed6ae6bcd82200284`.

Direct `app.asar` inspection confirmed:

- compiled Profile Store contains the `ProfileStudio/Profiles` path and no
  `ensureSeededProfiles` API;
- compiled normalization contains `defaultCreatorAgentProviderId` and the
  `codex` option;
- compiled Core contains no `codex-profile-creator-agent` id;
- the packaged renderer reads the provider-only settings field.

The rebuilt package launched successfully with main process `5719`, Core
process `5723` and renderer process `5728`.

## Focused User Retest

1. Open Settings → Profile Studio and confirm the only option is
   `Codex Profile Creator Agent` with `Codex / GPT-5.6 Sol / high` metadata.
2. Open Profile Studio and confirm no previous Draft/profile or creator
   session is restored.
3. Confirm the compatible-profile list is empty for the selected target.
4. Create one new Draft and confirm its standard creator session appears as a
   fresh session and survives leave/re-entry.
5. Confirm the new Draft is written below
   `~/.harness-ai/ProfileStudio/Profiles`, not the retired top-level
   `~/.harness-ai/Profiles`.

