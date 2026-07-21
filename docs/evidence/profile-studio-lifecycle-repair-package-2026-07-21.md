# Profile Studio Lifecycle Repair Package Evidence (2026-07-21)

Focused packaged-acceptance repair after the user confirmed Draft creation but
found that the creator session disappeared after leaving/reopening Profile
Studio and that created profiles had no delete operation.

## Repairs

- Commit `5ba4f0c1` (`fix: restore profile studio sessions on reentry`):
  - entering Studio first replaces the shared session controller with the full
    persisted `profile-studio` workspace list and only then mounts Studio;
  - the newest persisted creator session seeds the exact provider, model and
    profile id instead of resetting the sidebar to the first target;
  - returning still restores the ordinary selected workspace/session list.
- Commit `4d3b9c95` (`feat: delete profile studio profiles`):
  - one Core RPC validates that the target is a Studio v2 profile;
  - deletion is contained to the exact loaded directory below the profiles
    root, so legacy/Native profiles cannot enter this route;
  - the bound creator session is removed through Session Runtime's existing
    cascade, including provider/session artifacts and persisted event history;
  - an already-absent bound session is treated as completed cleanup.
- Commit `13adebf3` (`feat: add profile studio delete control`):
  - every created-profile row has a delete action;
  - deletion requires an in-app modal confirmation naming both the profile and
    its Profile Creator Agent session; no native browser dialog is used;
  - pending/errors remain visible and a successful result selects the next
    compatible profile/session or clears the center and inspector.

## Verification

- All three implementation commits passed plan validation, architecture,
  Ultracite, Knip, typecheck, docs-sync and `Tests: OK (145)`.
- Pre-package checks passed: duplication thresholds, production dependency
  audit (`0` vulnerabilities), link check and production build.
- `npm run package:mac` rebuilt runtime, renderer and the unsigned macOS arm64
  Electron package from source revision
  `13adebf33b32cf3388ee7c61a7c6688bee512036`.

Package identity:

- application: `release/mac-arm64/Harness AI.app`;
- packaged renderer: `/dist/renderer/assets/index-DZapb0fC.js` and
  `/dist/renderer/assets/index-CpxuFWS7.css`;
- `app.asar` size: `32488076` bytes;
- `app.asar` modification time: `2026-07-21T10:45:24+0200`;
- SHA-256:
  `8997dc6ae694afe860e3e4797649856a307fc249052511c873cacc46de208f13`.

Direct `app.asar` inspection confirmed:

- Core dispatch/RPC strings for `delete-profile-studio-profile`;
- lifecycle containment and exact-directory removal code;
- preload `deleteProfileStudioProfile` exposure;
- renderer delete confirmation copy and delete bridge call;
- the fresh renderer JS/CSS assets listed above.

The rebuilt package launched successfully with main process `59474`, Core
process `59513` and renderer process `59562`.

## Focused Retest

1. Open Profile Studio and create/select one Draft.
2. Write a message so the creator session has a recognizable transcript.
3. Return to ordinary workspaces/sessions, then reopen Profile Studio.
4. Confirm the same provider, model, Draft row, central creator session and
   transcript are restored together.
5. Click the trash action on a created profile and cancel once; confirm nothing
   changes.
6. Open it again, confirm deletion and verify the row disappears. If another
   compatible profile exists, it and its creator session become active;
   otherwise the center and inspector show their empty state.
7. Return/reopen Studio once more and confirm the deleted profile and creator
   session do not reappear.

Deleting a Studio profile is intentionally destructive after confirmation; the
first-stage product does not implement profile rollback or recovery.
