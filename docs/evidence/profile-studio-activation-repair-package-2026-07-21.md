# Profile Studio Activation Repair Package Evidence (2026-07-21)

Focused packaged-acceptance repair after the first Profile Studio MVP package
opened the single-window layout but lost the new creator session and inspector
immediately after Draft creation.

## Rejected Package Evidence

User screenshots from 2026-07-21 showed:

- before Create: empty center and `Профиль не выбран` inspector;
- after Create: active `New Profile · Draft` row, but the center remained empty
  and the inspector still said that no profile was selected.

Runtime evidence proved that Core had created and persisted the Draft and
creator session. Two Application Shell races hid them:

1. `session:created` refreshed the currently selected ordinary workspace and
   replaced the shared session array, removing the just-added Studio session;
2. compatible-profile reconciliation selected the same profile id again and
   cleared an inspector snapshot that had already loaded.

The same runtime log recorded a separate Claude provider failure:
`OAuth session expired and could not be refreshed`. Provider failure must be
visible inside the creator session; it must not remove the session or inspector.

## Repairs

- Commit `16ab2de6` (`fix: activate profile studio draft sessions`):
  - one successful Create response immediately inserts/selects the returned
    Draft row and adds/activates its returned persisted creator session;
  - Studio mode refreshes only workspace id `profile-studio` for session
    create/update events;
  - same-id list reconciliation no longer clears the inspector.
- Commit `b4c1c4ed` (`fix: bind profile creator to selected target`):
  - new creator sessions execute on the exact provider/model selected in
    Studio instead of fixed Claude/Opus;
  - Claude and Codex creator targets use reasoning `high`; Kimi reasoning stays
    provider-managed;
  - persisted session identity, provider binding and every creator turn use
    the selected model;
  - the existing inline creator system prompt, empty managed tools and output
    schema remain attached.

No automatic initial user turn was added. Its content and launch moment have
not been agreed; this package intentionally opens a normal user-writable creator
session so the user can start the conversation manually.

## Verification

- Commit gates passed for both repair commits: plan validation, architecture,
  Ultracite, Knip, typecheck, docs-sync and `Tests: OK (145)`.
- Pre-package checks completed: duplication reports, production dependency
  audit (`0` vulnerabilities), and link check.
- `npm run package:mac` rebuilt runtime, renderer and the unsigned macOS arm64
  Electron package from source revision
  `b4c1c4ed32ea86a6aa811a0273206ccdf6f8938a`.

Package identity:

- application: `release/mac-arm64/Harness AI.app`;
- packaged renderer: `/dist/renderer/assets/index-BbKYKrZG.js`;
- `app.asar` size: `32481580` bytes;
- `app.asar` modification time: `2026-07-21T10:13:00+0200`;
- SHA-256:
  `8a1eab4c0bfc801082f38421b8fcf90ed0055f413de53b2193f9e8c045919bec`.

Packaged string/path proof includes all Profile Studio UI labels, the target
derived ``session-${target.target.providerId}-...`` id, provider-name mapping
from `spec.providerId`, and creator turn option `model: session.model`.

The rebuilt package was launched successfully; initial main/Core process ids
were `25666` and `25670`.

## Focused Retest

1. Open Profile Studio, select Claude/Sonnet and press `Создать профиль`.
2. Confirm `New Profile · Draft` becomes selected and the ordinary session
   interface appears immediately in the center.
3. Confirm the status panel model is `sonnet`, not the old fixed `opus`.
4. Confirm the right side immediately shows `Overview`,
   `Custom System Prompt`, and `Custom System Tools` for that Draft.
5. If Claude OAuth is still expired, confirm the provider error is visible in
   the session while both center and inspector remain present.
6. With valid provider authorization, type a manual first message and confirm
   it follows the ordinary session workflow.
7. Return to workspaces, reopen Studio and select the Draft; confirm its
   creator session and inspector restore together.

Cross-provider structured-output parity and the automatic first creator turn
remain later workflow checks; they are not claimed by this focused repair.
