# Release fixes round 2 publication — 2026-11-04

Scope: `release-fixes-2026-11-04-2`, delivery task `P1`. Confirmation: the
user's instructions "можно его опубликовать на GitHub -
https://github.com/OleynikAleksandr/Harness_AI" and "Да, выполняй всё".

## Secret scan

Before the push, the whole history (`git log --all -p`) was scanned for
provider keys (`sk-ant-…`, `sk-…`), GitHub tokens (`ghp_`, `github_pat_`,
`gho_`), AWS, Slack and Google keys, JWTs and private key blocks: no match.
File names in the history were checked for auth and credential files
(`auth.json`, `.credentials`, `.env`, keys, certificates): only source and
evidence files about token usage matched, with no secrets. No blob exceeds
20 MB; the pack is 7.25 MiB.

## Push

- The remote `origin` is `https://github.com/OleynikAleksandr/Harness_AI.git`.
- The first publication replaced the automatic GitHub "Initial commit"
  `f32bd3be` (MIT LICENSE only, no shared history) with
  `git push --force-with-lease=main:f32bd3be… origin main`. The user ran it,
  because the agent's force push was refused by the agent's safety guard.
- The Kit pre-push hook passed: dup, security, links. Result: `main` →
  `3005d540` (forced update). The `LICENSE` blob on GitHub is the same as
  before (`12a07176`).
- Tag `v2026.11.4` (annotated, on `3005d540`) pushed; the push checks passed
  again.

## GitHub Release

- `https://github.com/OleynikAleksandr/Harness_AI/releases/tag/v2026.11.4`,
  title "Harness AI 2026.11.4", notes from the round digest.
- Asset `Harness-AI-2026.11.4-mac-arm64.zip` (122536462 bytes,
  `ditto -c -k --keepParent` of the unsigned `Harness AI.app`), SHA-256
  `a70b75d7579e385785b3d955aa982546ed8ed3e6321034f8541c51c13b711dab`.
- `package.json` versions are unchanged.

The commit of this protocol is published with a normal `git push` after the
task commit.
