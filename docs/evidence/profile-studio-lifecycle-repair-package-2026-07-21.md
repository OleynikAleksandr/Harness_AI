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

First lifecycle package identity (deletion accepted, re-entry rejected):

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

## Re-entry Race Repair Package

The user accepted deletion but rejected creator-session re-entry with
screenshots at 2026-07-21 11:18. The exact Codex Draft row and inspector were
restored, while the center column was completely blank.

Persisted runtime evidence proved that no profile/session data was lost:

- profile `draft-605a89d3-a418-4233-a557-69a6db405ca2` still referenced
  creator session `session-codex-6d80ed91-1add-4518-ba2b-646c0c81fde3`;
- the session index still contained provider `codex`, model `gpt-5.6-sol`,
  workspace `profile-studio` and the same profile id;
- the session event JSONL still contained creation, binding and telemetry
  events.

Root cause: `openProfileStudio()` waited for Studio hydration before changing
the React application-mode state. During that interval, the live
`session:updated` subscription still routed a list refresh to the ordinary
workspace. A late ordinary response then replaced the newly restored Studio
session array; profile/inspector state remained independently correct, so only
the central `SessionSurfaceFacade` disappeared.

Commit `131ee203` (`fix: prevent profile studio session refresh races`) closes
both sides of the race:

- a synchronous application-mode ref changes event routing to
  `profile-studio` before async hydration begins;
- the shared session-state hook records the workspace currently owning its
  list and discards every late response for a previous workspace;
- the same ownership rule protects the reverse Studio-to-ordinary transition.

All commit gates passed again with `Tests: OK (145)`. Duplication thresholds,
production audit (`0` vulnerabilities), links and production build also
passed before repackaging from source revision
`131ee2033087793cf185a5c78aaee157bc9675df`.

Second package identity (supersedes the rejected package above):

- application: `release/mac-arm64/Harness AI.app`;
- renderer: `/dist/renderer/assets/index-CXgCvZ3B.js` and
  `/dist/renderer/assets/index-CpxuFWS7.css`;
- `app.asar` size: `32488237` bytes;
- `app.asar` modification time: `2026-07-21T11:23:53+0200`;
- SHA-256:
  `10561ef79ccc69151965d061af66f67ecdfdf59bc8d5a5e9ec9110f0874bc42a`.

The rebuilt package launched with main process `80129`, Core process `80290`
and renderer process `80312`. A live UI check against the preserved Codex
Draft completed this exact sequence:

1. open Profile Studio — standard session header, transcript, input and status
   panel rendered beside the matching profile/inspector;
2. return to ordinary workspaces/sessions;
3. reopen Profile Studio — the same central session surface and exact
   Codex/GPT-5.6 Sol profile/inspector rendered again.

The restored Codex session separately reports `no rollout found for thread
id` during provider resume. That provider-binding condition does not remove the
session surface and is not treated as part of this renderer race repair.
