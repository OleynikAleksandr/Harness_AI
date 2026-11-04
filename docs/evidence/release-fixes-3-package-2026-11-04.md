# Release fixes round 3 package — 2026-11-04

Scope: `release-fixes-2026-11-04-3`, delivery task `D1`. Source commit:
`e621b513` (`docs: reconcile documentation for R1`). Confirmation: the user's
instruction "Закрывая предыдущие составляй новую спецификацию и to-do plan, и
выполняя ее вплоть уже до публикации на GitHub."

## Build

- `npm run package:mac` → exit 0 (it runs `npm run build` first);
  `release/mac-arm64/Harness AI.app` (unsigned, default icon); `app.asar`
  33 MB. The running app was quit before packaging.
- `Resources/workflow-kit/workflow.mjs` is byte-identical to
  `dist/workflow-kit/workflow.mjs`, has `KIT_VERSION = "2.2.0"`, the commands
  `pause:set`, `schema`, `context`, the refusals `WORKFLOW_PAUSED` and
  `CONTEXT_TOO_LARGE`, and the managed block "Inputs and documents".
- `app.asar` contains the `workflow-pause-set` route, `withRealGitConfig`, the
  plan panel pause strings; `harness-ai-local` remains only in a code comment
  of `workspace-registry-facade.js` (an old saved entry is an ordinary project).
- `open "release/mac-arm64/Harness AI.app"` from a shell with the real `HOME`
  → the main and helper processes start with `HOME=/Users/oleksandroliinyk`.

## Kit bundle smoke on a temporary project

In a subshell with a temporary `HOME` (the app was not started from it):

- `identity:set --global`, `install --host harness` → ok;
- `schema` lists seven inputs; `schema digest` prints the limits
  (`result` 600 bytes, 8 items);
- `context "docs/spec.md#Two"` prints the section in `<document>` markers;
  `context .harness/workflow/config.json` → `CONTEXT_FORBIDDEN`;
- `pause:set --on` → `status` shows `paused: true`; `pause:set --off` → ok;
- `doctor` warns `doc-size` for a 30006-byte document;
- `recover` contains the `schema` and `documents` sections.

## Left to the user's check

These are left to the user's check in the packaged app:
- the start screen without a project and removing any project, including
  the old "Harness AI" entry;
- the autopilot running by default;
- Pause / "Pausing after the current task" / Continue in the plan panel;
- the status strip without the toggle;
- an agent installing the Kit in a new folder with the user's identity.
