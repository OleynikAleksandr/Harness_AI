# Release fixes round 3 publication — 2026-11-04

Scope: `release-fixes-2026-11-04-3`, delivery task `P1`. Confirmation: the
user's instruction "составляй новую спецификацию и to-do plan, и выполняя ее
вплоть уже до публикации на GitHub".

## Secret scan

Before the push, the whole history (`git log --all -p`) was scanned for
provider keys (`sk-ant-…`, `sk-…`), GitHub tokens (`ghp_`, `github_pat_`,
`gho_`), AWS, Slack and Google keys, JWTs and private key blocks: no match.
The files added since the previous publication were checked for auth and
credential file names: none. No new blob exceeds 20 MB.

## Push

- `origin/main` `06b46c50` is an ancestor of `main`, so `git push origin main`
  was a normal fast-forward: `06b46c50..d566ce95`. The Kit pre-push hook
  passed: dup, security, links.
- Tag `v2026.11.4.2` (annotated, on `d566ce95`, the second release of the
  day) pushed; the push checks passed again.

## GitHub Release

- `https://github.com/OleynikAleksandr/Harness_AI/releases/tag/v2026.11.4.2`,
  title "Harness AI 2026.11.4.2", notes from the round digest.
- Asset `Harness-AI-2026.11.4.2-mac-arm64.zip` (122571642 bytes,
  `ditto -c -k --keepParent` of the unsigned `Harness AI.app`), SHA-256
  `a297d634e9de8bb204649a2ab462ab5da543df6a1c056613b086a0a91e80eada`.
- `package.json` versions are unchanged.

The commit of this protocol is published with a normal `git push` after the
task commit.
