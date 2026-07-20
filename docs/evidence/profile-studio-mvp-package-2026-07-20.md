# Profile Studio MVP macOS Package Evidence (2026-07-20)

Packaged-application evidence for active plan
`profile-studio-mvp-2026-07-20`, produced after the integrated build recorded
in `profile-studio-mvp-build-2026-07-20.md`.

## Package Identity

- Package command: `npm run package:mac`.
- Package source revision:
  `47db9cd9b87cf73ea219ec9b9d5ebd2d9ea8ad12`.
- Package path:
  `release/mac-arm64/Harness AI.app`.
- Platform: macOS arm64; Electron `42.5.0`; unsigned as configured.
- App version / build: `0.0.0` / `0.0.0`.
- `app.asar` path:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- `app.asar` size: `32480620` bytes.
- `app.asar` modification time: `2026-07-20T19:05:01+0200`.
- `app.asar` SHA-256:
  `be15680738c16a7fa3d86fb9493dcd6ae97bb58552db7c970167266d7c1c7caa`.

The package workflow stopped the previous packaged application process before
rebuilding. It rebuilt TypeScript runtime and Vite renderer artifacts, then
created a fresh Electron directory package.

## Packaged-Artifact Proof

The `app.asar` listing contains the fresh renderer artifacts:

- `/dist/renderer/index.html`;
- `/dist/renderer/assets/index-THkRdbcg.js`;
- `/dist/renderer/assets/index-w5xcLhNv.css`.

It also contains all four Core Profile Studio modules (`agent`, `authoring`,
`lifecycle`, `read-model`), `core-profile-studio-rpc.js`, the profile catalog
and Codex profile application layer.

Fixed-string checks against the packaged archive returned:

- `Profile Studio` = 9;
- `Custom System Prompt` = 3;
- `Custom System Tools` = 3;
- `Draft-only until the universal client reaches 25/25` = 1;
- `baseInstructions full-replacement` = 1.

These checks prove that the package is not the stale pre-Studio application
and that its bundled runtime includes the accepted Kimi and Codex capability
truth.

## Launch

The exact package above was launched with `open -n`. The packaged Electron main
process and its Core child were observed running from
`release/mac-arm64/Harness AI.app/Contents/MacOS/Harness AI` (initial process
ids `91906` and `91910`).

## User Retest Checklist

1. Confirm `Profile Studio` appears beside `Settings` in the ordinary left
   sidebar and opens Studio in the same window.
2. Confirm the return control restores workspaces and ordinary sessions.
3. In Studio, switch provider/model targets and verify each target loads only
   its own created-profile sessions; raw Native captures are not profile rows.
4. Create a profile and verify one Draft plus one persistent Profile Creator
   Agent session appears; continue the conversation in the unchanged ordinary
   session interface in the center.
5. Verify the inspector tabs are exactly `Overview`, `Custom System Prompt`
   and `Custom System Tools`, and that their content updates from Core after
   accepted agent output.
6. For Claude, select/propose a real Native Capture donor, finish the two prompt
   parts and native tool subset, perform manual tasks, then explicitly approve
   the current hash. A missing/invalid donor must keep approval blocked.
7. For Codex, verify the profile is prompt-only and the inspector honestly
   reports provider-fixed tools.
8. For Kimi, verify authoring remains available but approval/application stays
   blocked with the current 9/25 versus 25/25 parity reason.
9. Return to ordinary session creation, select the exact provider/model and
   verify only a matching Valid Studio profile appears and starts with its
   immutable applied-profile snapshot.
10. Confirm ordinary Native sessions still start and behave as before.

Custom Capture UI, automated behavioral benchmarks, Normalizer, direct user
document editing and automated donor-refresh migration remain intentionally
outside this MVP and must not appear as simulated working controls.
