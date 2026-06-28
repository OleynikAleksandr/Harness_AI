# Codex Native Workspace Instructions Evidence

Date: 2026-06-28

## Reference Findings

- CodeAI-Hub standalone workspace chats use the selected provider's default system instructions and tooling instead of a workflow prompt pack.
- CodeAI-Hub Codex native capture uses `codex:default` and omits `baseInstructions` and `config` for vanilla/native Codex requests.
- The workflow profile sets `project_doc_max_bytes: 0`, which is correct for managed workflow prompts but wrong for ordinary workspace Codex sessions that should use native project instruction discovery.

## Harness Implementation

- Harness Codex app-server sessions now start with `codex:default`.
- Ordinary `thread/start` no longer sends the CodeAI workflow `baseInstructions`.
- Ordinary `thread/start` no longer sends the workflow `config` that disables project document loading.
- Codex starts with the active workspace as `cwd`, so native Codex project instruction discovery can read workspace `AGENTS.md`.

## Verification

- `node product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.test.mjs`
