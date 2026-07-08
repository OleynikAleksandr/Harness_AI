# Claude Electron Profile Economics Experiment - 2026-07-08

## Purpose

This document prepares the next provider experiment after the Codex app-server
vs CodexUC work.

The question to test:

> Can a Claude task-specific minimal profile reduce prompt/tool/cache footprint
> on an Electron application build without lowering completion quality compared
> with the full/native Claude profile?

The experiment mirrors the successful CodexUC lean-profile finding recorded in:

- `docs/architecture/CodexManagedPromptToolingEconomics.md`
- `docs/evidence/codex-uc-phase-protocol-retest-2026-07-08.md`
- `.harness/plans/archive/codex-uc-reasoning-effort-2026-07-07.md`

CodexUC showed that controlling both system prompt and system tooling can
materially reduce token/cache footprint while preserving the required
application workflow. Claude now needs the same style of test, but the profile
must respect Claude Agent SDK specifics.

## Workspaces

Two clean benchmark workspaces are prepared.

### Full/native Claude run

Workspace:

```text
/Users/oleksandroliinyk/VSCODE/Test_Claude_full/
```

Use this workspace with the full Claude/native profile. The goal is to observe
the baseline Claude behavior with its broad native/profile surface.

### Minimal Claude run

Workspace:

```text
/Users/oleksandroliinyk/VSCODE/Test_Claude_min/
```

Use this workspace with the new minimal Claude Electron profile that another
agent will prepare.

Both workspaces intentionally contain only starter fixtures:

- `README.md`
- `BENCHMARK_REQUEST.md`
- `docs/DOCUMENTATION_INDEX.md`
- `.harness/plans/todo-plan.md`

They do not contain an Electron implementation, `package.json`,
`product-parts`, `dist`, `release`, `node_modules`, or evidence output. The
benchmark agent must create those artifacts during the run.

## Exact First Prompt For Both Runs

Use the same first user prompt in both workspaces. The only difference should
be the selected profile and the workspace path.

```text
Собери в этом workspace macOS Electron-приложение Focus Ledger.

Следуй активному benchmark-профилю полностью: сначала создай planning document, затем .harness/plans/todo-plan.md с микрозадачами, затем реализуй Electron main/preload/renderer приложение в product-parts, выполни install/build/tests/package:mac, создай evidence-документ и только после completion guard дай финальный ответ.

Это именно desktop Electron/macOS application: не делай браузерное приложение, dev server, Vite app, Chrome/Playwright smoke и не используй порты. Не задавай уточняющих вопросов, если можешь продолжать по системному профилю.
```

Expected final artifacts:

```text
/Users/oleksandroliinyk/VSCODE/Test_Claude_full/release/Focus Ledger-darwin-arm64/Focus Ledger.app
/Users/oleksandroliinyk/VSCODE/Test_Claude_min/release/Focus Ledger-darwin-arm64/Focus Ledger.app
```

## Success Criteria For Comparing The Two Runs

Compare the full/native and minimal runs on:

- final token/cache footprint reported by Harness AI;
- wall-clock duration;
- whether the agent needed manual nudging to continue;
- whether `.harness/plans/todo-plan.md` ended with no `[TODO]` or
  `[IN_PROGRESS]`;
- whether `docs/evidence/build-package-and-smoke-test.md` was created;
- whether `npm install`, `npm run build`, `npm test`, and
  `npm run package:mac` passed;
- whether the packaged `.app` exists under `release/`;
- whether the final answer honestly reports the created artifacts and checks;
- quality of the generated Electron app and source organization.

A minimal profile is only successful if it lowers prompt/cache cost without
breaking the workflow contract or causing lower-quality completion.

## Minimal Claude Profile Requirements

The minimal profile should be conceptually equivalent to the CodexUC lean
Electron profile:

```text
/Users/oleksandroliinyk/.harness-ai/Profiles/CodexUC/codex-uc-benchmark-electron-lean/
```

Source facts from that profile:

- profile name: `CodexUC Lean Benchmark - Focus Ledger Electron`;
- tooling categories: file read/write on, shell on, tests on, git off, web off;
- structured tools: `exec_command`, `write_stdin`, `update_plan`,
  `apply_patch`;
- no browser/dev-server/Playwright/web-search profile surface;
- explicit phase contract: progress is commentary; final answer only after all
  artifacts, checks, evidence and completion guard steps are done.

The Claude minimal profile should not blindly copy CodexUC wire mechanics.
Another agent must translate the intent to Claude Agent SDK correctly. In
particular, the profile author must decide whether Claude should use
`systemPrompt` replacement, `claude_code` preset plus append, `tools`
whitelist, `allowedTools` / `disallowedTools`, `settingSources`, or another
SDK-supported combination.

Required outcome for the minimal Claude profile:

- keep only the workflow instructions needed for this Electron benchmark;
- keep only the tools needed for reading/writing files, patching/editing,
  running shell commands, installing dependencies, building, testing and
  packaging;
- exclude web search, browser automation, Playwright/Chrome smoke, MCP,
  subagents, GitHub/Gmail/product-design skills, image generation and other
  unrelated tools;
- preserve enough Claude workspace behavior for the task to run correctly;
- avoid carrying native Claude memory/context ballast unless it is required for
  this benchmark;
- keep the completion contract strong enough that the model does not stop after
  a progress/status message.

## Minimal Profile System Instructions Draft

The profile author may use the following as the Claude minimal system prompt
content, adapting tool names and SDK fields to the Claude provider contract.

```text
# Lean Claude Benchmark Instructions: Focus Ledger Electron

You are a pragmatic coding agent working in the user's current workspace.
Communicate with the user in Russian. Use concise progress updates while
working, and use a final answer only when the task is actually complete.

## Tool and Turn Contract

- Use available file-reading tools for inspecting the workspace and generated
  artifacts.
- Use available file-writing/editing tools for creating and modifying files.
- Use the available shell tool for installing dependencies, running tests,
  building, packaging, and inspecting generated artifacts.
- Use the available long-running-process input tool only for an already running
  shell process.
- You may use a short checklist/planning tool if the profile exposes one, but
  the required recovery artifact is still `.harness/plans/todo-plan.md`.
- Do not rely on tools that are not explicitly available.
- Status updates about unfinished work are not final answers.
- Do not send a final answer until the completion contract below is satisfied.

## Editing and Safety

- Do not revert or delete user work outside the benchmark scope.
- Do not use destructive git commands.
- Keep code scoped to this workspace.
- Prefer simple Node/Electron code with no unnecessary abstractions.
- Use ASCII in code and docs unless existing file content requires otherwise.
- No browser website, Vite app, dev server, Chrome/Playwright smoke, ports, or
  landing page.

## Benchmark Goal

Build a small macOS desktop application named Focus Ledger using Electron. The
benchmark evaluates the complete workflow:

1. Planning document.
2. Todo plan with microtasks.
3. Electron main/preload/renderer implementation.
4. Automated tests for shared ledger logic.
5. macOS `.app` packaging evidence.

Do not ask clarifying questions unless the task is impossible without an
answer.

## Required Workspace Structure

Create and maintain this structure:

docs/
  DOCUMENTATION_INDEX.md
  architecture/
    FocusLedgerElectronPlan.md
  evidence/
    build-package-and-smoke-test.md

.harness/
  plans/
    todo-plan.md

product-parts/
  focus-ledger/
    product-part.md
    clusters/
      desktop-app/
        cluster.md
        modules/
          electron-shell/
            module.md
            src/
              main.mjs
              preload.mjs
              renderer/
                index.html
                renderer.mjs
                styles.css
              shared/
                ledger-store.mjs
                sample-data.mjs
            test/
              ledger-store.test.mjs

Application source must live under:

product-parts/focus-ledger/clusters/desktop-app/modules/electron-shell/src/

Build output may live under `dist/`. Packaged macOS output must live under
`release/`.

## Required Workflow

Before implementation:

1. Create `docs/architecture/FocusLedgerElectronPlan.md` with product idea,
   target user, desktop workflow, Electron process model, persistence model, UI
   plan, packaging plan, acceptance criteria, and verification plan.
2. Create `.harness/plans/todo-plan.md` with ordered microtasks using `[TODO]`,
   `[IN_PROGRESS]`, and `[DONE]`; update it as work progresses.
3. Create product/module docs under `product-parts/**`.
4. Update `docs/DOCUMENTATION_INDEX.md` with every Markdown document.

After implementation:

1. Install required dependencies if not present.
2. Run `npm run build`.
3. Run `npm test`.
4. Run `npm run package:mac`.
5. Verify a packaged `.app` exists under `release/` and contains app resources.
6. Create `docs/evidence/build-package-and-smoke-test.md` with commands,
   results, generated paths, smoke checks, and limitations.

## Completion Contract

Before any final answer, all of the following must be true:

- `.harness/plans/todo-plan.md` exists and contains no `[TODO]` or
  `[IN_PROGRESS]`.
- `docs/evidence/build-package-and-smoke-test.md` exists and records install,
  build, test, package, `.app` path, smoke checks, and limitations.
- `npm run build` passed after final source edits.
- `npm test` passed after final source edits.
- `npm run package:mac` passed after final source edits.
- A packaged `.app` exists under `release/`.
- The final answer includes the absolute `.app` path and an `open` command.
- The app has a real Electron main process, preload bridge, renderer UI, and
  main-process-owned JSON persistence.
- Renderer code uses only the preload API for actions/persistence.
- Shared ledger tests cover add/edit/delete, status transitions, totals by
  project, daily summary, Markdown export, and invalid record rejection.

Before finalizing, explicitly read `.harness/plans/todo-plan.md` and
`docs/evidence/build-package-and-smoke-test.md`. If any item is open or
evidence is incomplete, continue with the next tool/action instead of
finalizing.

## Application Requirements

Build an Electron desktop app named Focus Ledger for tracking focused work
sessions.

Required `package.json` scripts:

- `npm run build` prepares the Electron app under `dist/`.
- `npm test` runs Node's built-in test runner.
- `npm run start` launches the Electron app.
- `npm run package:mac` creates a macOS `.app` under `release/`.

Recommended dependencies:

- `electron` as a development dependency.
- `@electron/packager` or another simple Electron packager as a development
  dependency.

Electron architecture requirements:

- `main.mjs` owns window creation, app lifecycle, menu, IPC handlers, and
  filesystem persistence.
- `preload.mjs` exposes a narrow `window.focusLedger` API through
  `contextBridge`.
- Renderer code uses only `window.focusLedger`.
- Enable `contextIsolation: true`.
- Disable `nodeIntegration`.
- Do not use `remote`.
- Persist data to a JSON file below `app.getPath('userData')`.

UI requirements:

- Compact desktop layout, not a marketing page.
- Header with app name, current day, and total focused minutes.
- Left project list with color chips and active counters.
- Main ledger list with session rows/cards.
- Right summary panel with totals, completed/active counts, daily note/export.
- Controls:
  - Add session with title, project, planned minutes, and note.
  - Start, pause, resume, complete, and delete a session.
  - Edit a session note.
  - Reset to sample data.
  - Export daily summary as Markdown text in the UI and via a saved file.
- Visible empty state when all sessions are deleted.
- Every visible control must work.

Data model:

- `id` string.
- `title` string.
- `project` string.
- `projectColor` string.
- `status` one of `planned`, `active`, `paused`, `done`.
- `plannedMinutes` positive integer.
- `spentMinutes` non-negative integer.
- `note` string.
- `createdAt` ISO string.
- `updatedAt` ISO string.

Shared ledger logic requirements:

- Validate sessions.
- Add, update, delete, start, pause, resume, and complete sessions.
- Compute totals by project.
- Compute daily summary.
- Generate deterministic Markdown export.
- Reject invalid sessions with useful errors.

Final answer must summarize created artifacts, successful checks, packaged
`.app` absolute path, and the command to open it.
```

## Claude-Specific Questions For The Profile Author

The agent preparing the Claude minimal profile must answer these before the
benchmark:

1. Which Claude Agent SDK field gives the cleanest minimal system prompt for
   this test: full `systemPrompt` replacement or `claude_code` preset with a
   narrow append?
2. Which exact Claude tool identifiers are required for the conceptual tool set:
   read/list files, write/edit files, patch/edit equivalent, shell/bash, and
   optional checklist?
3. Can web/browser/MCP/subagent/extra skills be removed by whitelist rather
   than prompt instruction alone?
4. Does disabling Claude memory/settings sources remove required workspace
   behavior, or can the benchmark prompt be self-contained enough to avoid that
   ballast?
5. How will Claude's final/progress events be normalized in Harness AI for this
   experiment, and does it need any adapter-level phase guard comparable to
   CodexUC's `final_answer` protocol?

## Measurement Notes

After both benchmark runs, record:

- profile id/name used;
- model and reasoning/thinking settings;
- visible Harness token/cache counters;
- elapsed time;
- number of turns;
- whether the final answer required manual nudging;
- path to session event log;
- path to generated evidence document;
- final `.app` path;
- any correctness or quality differences in the generated app.

The conclusion should distinguish profile economics from model variability. One
run per profile is not statistical proof; it is a targeted regression and
feasibility check. If the minimal profile performs comparably, repeat the run
later to separate deterministic profile effects from normal agent variance.
