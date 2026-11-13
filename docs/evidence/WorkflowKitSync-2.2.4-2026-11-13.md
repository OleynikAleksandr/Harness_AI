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
