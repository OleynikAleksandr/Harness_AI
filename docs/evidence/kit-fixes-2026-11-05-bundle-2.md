# Workflow Kit 2.2.2 bundle — 2026-11-05

Scope: `release-fixes-2026-11-04-3`, round R3, delivery task `D3`. Source
commit: `ddae6a2a` (`docs: reconcile documentation for R3`). Confirmation:
the user's choice "Раунд исправлений: plan:extend добавит в этот scope
раунд: исправления Kit с тестами, DOCS и delivery-задачу сборки бандла Kit
(без публикации приложения и push)" and "Лучше исправь кит, чтобы
node_modules больше не портили комиты". No app package, push or GitHub
Release in this round.

## Build

- `npm run build:workflow-kit` → exit 0;
  `dist/workflow-kit/workflow.mjs` (419 KB, sha256
  `036c82fb602435575f03464c2f9c0c9ec12845da680263052a411f0fd32e0fc2`),
  `KIT_VERSION = "2.2.2"`.

## Smoke on a temporary project

With a temporary `GIT_CONFIG_GLOBAL` (`identity:set --global`), a git
project whose first commit tracked `node_modules/big/big.js` (600 lines)
and `node_modules/big/package.json`:

- `install` with the 2.2.1 bundle (copied from `Workflow_Kit`),
  `quality:apply` with a required commit check and `policy.maxFileLines`
  400, `scope:create` with task `A`, `task:start A`.
- `git rm -r --cached node_modules`, a new `src/a.ts`, then
  `commit --task A` on 2.2.1 → `COMMIT_FAILED`, journal error
  `kit:file-lines failed: node_modules/big/big.js: 600 lines (limit 400)`
  (the defect reported from `Workflow_Kit`).
- The staged deletion was reset, the project updated by running the new
  bundle: `node <bundle> install <project> --update` →
  `chore: update workflow kit to 2.2.2`, `inspect` `KIT_OK`.
- `git rm -r --cached node_modules` again and `commit --task A` →
  `chore: untrack node_modules`: the commit deletes both `node_modules`
  files and adds `src/a.ts`; `git ls-files` has no `node_modules` path,
  the files stay on disk; `doctor` `ok`.
- `inspect /Users/oleksandroliinyk/VSCODE/Workflow_Kit` with the new
  bundle → `KIT_OUTDATED`, action `update`, kit version 2.2.1.

## Observed outside the round

- `install --update` with the deletion still staged answers
  `FOREIGN_STAGED`, but the runtime and the manifest are already rewritten
  to 2.2.2 and left uncommitted; the next `commit --task` then runs on
  2.2.2 and passes. Unstage first (`git reset -q -- node_modules`), update,
  then `git rm -r --cached node_modules` again. A candidate for a later
  fixes round: refuse before writing.

## Left to the user's check

- Updating `Workflow_Kit` with `node
  /Users/oleksandroliinyk/VSCODE/harness-ai/dist/workflow-kit/workflow.mjs
  install /Users/oleksandroliinyk/VSCODE/Workflow_Kit --update`, then the
  pending `commit --task` after `git rm -r --cached node_modules`.
