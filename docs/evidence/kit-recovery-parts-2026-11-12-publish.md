# Workflow Kit 2.2.3 release publication — 2026-11-12

Scope: `kit-recovery-parts-2026-11-12`, delivery task `P1`. Confirmation: the
user's words «И выполни и пересобери новый релиз… Harness AI», «Я все
принимаю. Дальше делай все как положено» and, after the first push was held
back by the Claude Code auto mode, «Разрешаю, пуш и публикуй».

## Secret scan

Before the push, the whole history (`git log --all -p`) was scanned for
provider keys (`sk-ant-…`, `sk-…`), GitHub tokens (`ghp_`, `github_pat_`,
`gho_`), AWS, Slack and Google keys, JWTs and private key blocks: no match.
The files added since the previous publication were checked for auth and
credential file names: none. No new blob exceeds 20 MB.

## Push

- `origin/main` `95a13eb5` is an ancestor of `main`, so `git push origin main`
  was a normal fast-forward: `95a13eb5..ed9d9f75`. The Kit pre-push hook
  passed: dup, security, links.
- Tag `v2026.11.12` (annotated, on `ed9d9f75`) pushed; the push checks passed
  again.

## GitHub Release

- `https://github.com/OleynikAleksandr/Harness_AI/releases/tag/v2026.11.12`,
  title "Harness AI 2026.11.12", notes from the round digest.
- Asset `Harness-AI-2026.11.12-mac-arm64.zip` (122583012 bytes,
  `ditto -c -k --keepParent` of the unsigned `Harness AI.app`), SHA-256
  `b8e22524264f4fbee85f0d1a89f0b9f10cbaf6d7d454485e0ca52a0baa7aad6e`.
- `package.json` versions are unchanged.

The commit of this protocol is published with a normal `git push` after the
task commit.
