# Workflow Kit 2.2.1 bundle — 2026-11-05

Scope: `release-fixes-2026-11-04-3`, round R2, delivery task `D2`. Source
commit: `633c1544` (`docs: reconcile documentation for R2`). Confirmation:
the user's choice "Раунд исправлений: plan:extend добавит в этот scope
раунд: исправления Kit с тестами, DOCS и delivery-задачу сборки бандла Kit
(без публикации приложения и push)". No app package, push or GitHub
Release in this round.

## Build

- `npm run build:workflow-kit` → exit 0;
  `dist/workflow-kit/workflow.mjs` (418 KB, sha256
  `e1921b9e6d3a611177882bdca76b04e4aaa99c8672dae36cca6920a484f22981`),
  `KIT_VERSION = "2.2.1"`.

## Smoke on temporary projects

With a temporary `GIT_CONFIG_GLOBAL` (`identity:set --global`):

- `install` of a new project: the managed `.gitignore` block ends with
  `node_modules/`, `.venv/`, `__pycache__/`; `help` lists
  `assignment:cancel --id <id> [--force]`.
- `scope:create` with `checks: ["Open the app and check it manually"]` →
  `CHECK_UNKNOWN` naming `tasks[0].checks` of `A` and `acceptance`; no
  scope was written. `schema plan:extend` describes `tasks[].checks` as
  quality check ids with the rule.
- A project installed with the 2.2.0 bundle (copied from `Workflow_Kit`)
  updated by running the new bundle itself, `node <bundle> install <path>
  --update` → `chore: update workflow kit to 2.2.1`, `inspect` `KIT_OK`,
  the new `.gitignore` lines, doctor checks `ok`.
- `scripts/workflow install --update --bundle <new bundle>` run through the
  old launcher uses the installed 2.2.0 installer: it copies the new
  runtime but writes the 2.2.0 payload and manifest (`KIT_OUTDATED`
  afterwards). Updating needs the new bundle as the program, as above.

## Left to the user's check

- Updating `Workflow_Kit` with `node
  /Users/oleksandroliinyk/VSCODE/harness-ai/dist/workflow-kit/workflow.mjs
  install /Users/oleksandroliinyk/VSCODE/Workflow_Kit --update`, then
  `git rm -r --cached node_modules` and the next `commit --task`.
