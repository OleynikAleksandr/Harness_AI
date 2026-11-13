# Workflow Kit 2.2.4 synchronization evidence

Date: 2026-11-13. Scope: `workflow-kit-sync-2.2.4-2026-11-13`.
Specification: [WorkflowKitSync-2.2.4-2026-11-13.md](../architecture/WorkflowKitSync-2.2.4-2026-11-13.md).
Execution: sequential, no reviewer, as instructed by the user.

## Source and test parity

- Donor: Workflow_Kit commit `6e05505f33061f59e1ed8589f79064f77ad68fda`.
- Donor source digest: `20916a85d6e3eaa17506f64bcc721ec00c962ff4b4285a935791af5c8bbe423f`.
- Donor unpacked bundle SHA-256: `56aeed885eca6277e095acf5c0004d723c817b0372cc3876b4171ccf627b3479`.
- Compared all 107 TypeScript sources and 61 test/helper files across all 12 modules.
- 162 files match after normalizing import ordering, comments and formatting.
- Six remaining differences were reviewed: Vite in the host test, optional
  property order in installer/doctor options, the direct IntegrationOutcome
  type re-export, top-level orchestration assertion patterns and line wrapping
  in the worktree environment fixture. No missing or unexplained files remain.
- Tests stay in `src/**`; no dependency or application-version changes.
- A targeted lint comment explains the POSIX permission bitmask assertion.
- The Kit module contract remains below 28,000 bytes and links the full CLI reference.

Implementation commits: T001 `420ead1e`, T002 `16d392de`, T003 `729a7174`,
T004 `eeed8b14`, T005 `d0a1c2bb`. DOCS: `8553accb`.
Each source task passed the configured commit profile, including architecture,
lint, knip, typecheck, the full test runner and Kit documentation contracts.
The resulting repository has 229 runnable `.test.mjs` files.

## Installed repository Kit

- Previous installed version: 2.1.1. Current version: **2.2.4**.
- Installer service commit: `19181e2fbbd351bf47166c2357b69c0281eef142`.
- The first update was accidentally dispatched by the old 2.1.1 CLI. It copied
  the new runtime but retained the old manifest version (`da7e113c`). The
  update was repeated through the newly built 2.2.4 CLI before acceptance.
- Installed runtime and Harness build SHA-256: `ee444535f85f934de302a99d1c1129dcc8118e6482546af5121f5f4d05bcced6`.
- The manifest runtime hash matches; `doctor` and `validate` return `ok: true`.
- `status`, `schema scope:propose` and `recover` work with the installed CLI.
- Active scope, T006, revision 215 and existing Git history survived the update.
- Non-managed AGENTS rules, quality profile, docs contracts and policy are
  unchanged. The installer added the Harness host marker.
- Managed runtime, manifest, agent rules and hooks were written by the Kit
  installer; no hand edits were made to these managed files.

## SessionStart hook protocol

- Codex packet: 28432 UTF-8 bytes.
- Claude non-empty parts: 3, each below 10,000 UTF-16 units.
- All parts use digest `84e505f2cb1c` and reassemble exactly to the Codex packet.
- These are hook-output assertions. A new live Codex/Claude session was not
  started; provider consumption is not inferred from this check.

## macOS package and publication

Package execution and publication results are appended by their delivery tasks.
The user separately authorized packaging, GitHub publication and scope closure.
User acceptance remains a separate Workflow Kit operation.

## Preserved validation failure

The first T006 commit attempt failed in the unchanged Kimi runtime test:
its fixture-only `harness_test/mode` notification arrived before
`turn_started`, whereas the expected array required it after that event.
The fixture writes the mode response and then the notification during
`open()`; delivery relative to a later prompt is not ordered by that RPC.
The isolated unchanged test passed on rerun. This does not establish a fix;
the original failure is retained locally and a separate test stabilization
task will precede packaging. No Kimi production change is required.

## Kimi fixture stabilization (R2 / T009)

T009 separates only the named `harness_test/mode` setup echo from the exact
turn-order assertion. The existing separate assertion still requires its
`yolo` payload. All other events retain the original exact sequence; Kimi
production sources are unchanged. The module contract documents this test
boundary, and the task runs the complete quality profile before committing.

T009 committed as `be5e578147b5eaa87f63904b2efe0b0575b26419` after the full
quality profile passed. T006 is `c1f5c736542d4d1eb3e6a27b11c95ebafe38d99a`.
Duplication, security and link checks passed; the dependency audit reported
zero vulnerabilities. Packaging and publication are the remaining delivery tasks.

## macOS package verification (T007)

- Final `npm run quality`: passed, `Tests: OK (229)`.
- `check:dup`, `check:security`, `check:links`: passed; audit found zero vulnerabilities.
- `npm run build` and `npm run package:mac`: passed with signing disabled.
- Package: `release/mac-arm64/Harness AI.app` (Electron 42.5.0, arm64).
- Source HEAD before packaging: `61dfbd21a7786bb382e324e6d40a1e362b383519`.
- app.asar SHA-256: `77291f70c6dad8c6df5984c54996c9f31d74d64da7c3667d89ba0e4cb6c327d3`.
- Packaged Kit SHA-256: `ee444535f85f934de302a99d1c1129dcc8118e6482546af5121f5f4d05bcced6`; matches the installed repository Kit.
- Renderer loaded from the packaged `app.asar/dist/renderer/index.html`;
  development renderer/bundle overrides were removed from the test environment.
- CDP connected to this exact executable, preload was present, and a real
  click on New Project opened its dialog.
- Through the real preload/Core IPC, the app created a project outside the
  repository, installed Kit 2.2.4 and returned successful status and Doctor results.
- No renderer exceptions were observed. Screenshot and structured result
  remain local under `.harness/runtime/package-smoke-2.2.4/`.
- A temporary app profile, Harness home and Git config isolated the test;
  its processes were stopped by the controller. No native folder picker
  automation or new provider turn was claimed.

This verifies the packaged runtime and project preparation. Live provider
consumption of SessionStart and live Windows execution remain untested.

## GitHub publication (T008)

- Release: [v2026.11.13](https://github.com/OleynikAleksandr/Harness_AI/releases/tag/v2026.11.13).
- Published branch: `main`; release tag commit: `8dafd5864dee1a0cb65c2e5827c81c4c1c56ce2d`.
- Asset: `Harness-AI-v2026.11.13-mac-arm64.zip`; uploaded size: 122586229 bytes.
- ZIP SHA-256: `4aa909599490f5832b70644e985f90e4c63a87590a1d161911020474e9d1c091`. GitHub reports the same asset digest.
- GitHub asset state is `uploaded`; release is public, non-draft and not a prerelease.
- The history scan before publication checked 6819 unique blobs
  (98540383 bytes); no configured secret patterns matched.
- Normal push passed `dup`, `security` and `links` hooks; no force push or
  check bypass was used. Application and dependency versions were not changed.

T008 records the verified publication. Acceptance will be recorded only
from the user's explicit answer; the existing command to close the scope
will then be applied through Workflow Kit.
