# Kimi Native Request Capture Live Verification — 2026-07-16

## Scope

Verify that Settings -> General -> Native Request Capture can expose Kimi and
its three current Coding Plan models while recording the original installed
Kimi CLI default-agent request — system instructions plus native function-tool
schemas — instead of the Harness universal-client prompt/tool payload.

This evidence intentionally contains only structural metadata and hashes. It
does not reproduce the captured system prompts, tool schemas, authorization,
credentials, or request bodies.

## Runtime Contract

- Installed native CLI: `kimi 0.26.0` at `~/.kimi-code/bin/kimi`.
- Production Kimi sessions remain on `kimi-client-provider` and the Core
  universal client.
- Native capture uses the diagnostic-only `kimi-native-capture` module:
  temporary cloned native config/auth/device state, selected-model alias
  materialization, `kimi acp` default agent, and the Core reverse-forward
  bridge to `api.kimi.com`.
- The Core capture catalog exposes:
  - `kimi-for-coding` — K2.7 Coding;
  - `kimi-for-coding-highspeed` — K2.7 Coding HighSpeed;
  - `k3` — K3.
- Kimi exposes no separate reasoning selector. Core returns an empty reasoning
  list and `defaultReasoningEffort: null`; Settings hides that field and sends
  no invented effort.

## Live Capture Results

All three captures returned `ok: true`. Each raw request targeted
`api.kimi.com:443` at `/coding/v1/chat/completions`, and each selected model id
matched the real upstream `body.model` exactly.

| Selected model | Upstream model | System chars | System SHA-256 | Tools | Tool-set SHA-256 |
| --- | --- | ---: | --- | ---: | --- |
| `kimi-for-coding` | `kimi-for-coding` | 36,581 | `769b46e9c75b32d7fc917875d8bc8d943ffc2b2b6d6008a6a7f1260b7e25dbdc` | 25 | `dad69a931c8ab26fd0a806c42e07cbf1f7813259345f73e802e534c43ccc8f4f` |
| `kimi-for-coding-highspeed` | `kimi-for-coding-highspeed` | 36,581 | `c95d4d0a29a24e9324c6988b86993e71e2c37bddf982bc0ff3f14b75e517fd69` | 25 | `dad69a931c8ab26fd0a806c42e07cbf1f7813259345f73e802e534c43ccc8f4f` |
| `k3` | `k3` | 36,581 | `4ea6dabb08d7dd0040e61924a5d67baba1893d78c8673a95c8a26bc471a3d107` | 25 | `dad69a931c8ab26fd0a806c42e07cbf1f7813259345f73e802e534c43ccc8f4f` |

The three system-prompt hashes are distinct while the tool-set hash is stable.
The structural verification does not infer why the prompt text differs; it
only proves that each model produced its own captured native CLI payload and
that the selected model was not silently replaced by the CLI default.

The native tool names were identical across the three captures:

`Agent`, `AgentSwarm`, `AskUserQuestion`, `Bash`, `CreateGoal`, `CronCreate`,
`CronDelete`, `CronList`, `Edit`, `EnterPlanMode`, `ExitPlanMode`, `FetchURL`,
`GetGoal`, `Glob`, `Grep`, `Read`, `SetGoalBudget`, `Skill`, `TaskList`,
`TaskOutput`, `TaskStop`, `TodoList`, `UpdateGoal`, `WebSearch`, `Write`.

Every one of the 25 declarations contained a structured parameter schema.

## Artifact Verification

Local sensitive artifacts were written under
`~/.harness-ai/logs/native-request-capture/`:

- `2026-07-16T18-31-39-157Z-kimi-kimi-for-coding-native-request.{jsonl,diagnostics.jsonl,md}`;
- `2026-07-16T18-32-11-813Z-kimi-kimi-for-coding-highspeed-native-request.{jsonl,diagnostics.jsonl,md}`;
- `2026-07-16T18-32-12-968Z-kimi-k3-native-request.{jsonl,diagnostics.jsonl,md}`.

For every pair:

- raw JSONL contained one captured upstream request with `system` and `user`
  message roles plus the 25-tool array;
- the authorization header was persisted as `[REDACTED]`;
- diagnostics identified native CLI `0.26.0` and
  `mode: acp_default_agent`;
- Markdown rendered `Kimi Native Request Capture`,
  `native CLI reverse-forward transit`, a non-empty System Prompt section,
  and 25 readable Tool Declarations with nested function schemas;
- neither the system nor tools section fell back to a "not found" placeholder.

## Isolation And Cleanup

- No `kimi acp` process remained after the capture runs.
- No `kimi-capture-*` temporary HOME remained.
- The real native CLI configuration remained unchanged: `kimi provider list`
  still reported the user's one inline `kimi-for-coding` alias and default
  model `kimi-for-coding`. HighSpeed and K3 aliases existed only in temporary
  capture homes.
- Native CLI logs, sessions, telemetry, and user history were never cloned.

## Automated Verification

- Focused reverse-bridge, orchestrator, Kimi capture driver, Core RPC,
  descriptor, Settings-card, and artifact-parser tests passed.
- Commit gates passed architecture, formatting/lint, Knip, typecheck and the
  full suite after each implementation slice.
- Final implementation suite before the live captures: `Tests: OK (114)`.
- `npm run build` completed successfully for runtime and renderer.

## Package Status

No `npm run package:mac` was run for this scope. The packaged `Harness AI.app`
still requires separate explicit user confirmation before rebuild and manual
Settings verification.
