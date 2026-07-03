# Provider Native Request Capture Package Evidence - 2026-07-03 (Kimi reverse bridge)

## Scope

Ninth packaged rebuild on 2026-07-03, for the real Kimi native capture via the
reverse-forward bridge (`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6.7). The prior Kimi
`captureNativeRequest` was a stub: it recorded only paths (a `wire.jsonl` that
nothing writes) and the orchestrator completed a fake `captured` with zero
payload. The ACP wire leg (client<->agent JSON-RPC) carries no native system
prompt / tool schemas — those live only in the kimi binary's HTTPS request to
the LLM endpoint.

Empirical matrix (local base_url stub on a cloned `.kimi-code` home, zero
tokens; kimi-code 0.18.0): interactive TTY, `-p` print and `kimi acp` with the
DEFAULT agent all send the IDENTICAL native wrapping — system "You are Kimi
Code CLI..." ~3.7k tok + 23 native tools (~14.5k tok). The kimi Mach-O binary
IGNORES proxy env (`HTTP(S)_PROXY`/`ALL_PROXY`/`NODE_USE_ENV_PROXY` had no
effect), so variant B (request reaches the vendor through our transit) is a
reverse-forward bridge the client's config `base_url` is pointed at.

This build carries:

- `50fe0501` `feat(provider-network-capture): kimi native capture via reverse
  bridge` — new `NativeCaptureReverseBridge` (127.0.0.1 HTTP listener that
  records the matched request, forwards it 1:1 to the TLS upstream with only
  the Host header rewritten, relays the response), and the orchestrator routes
  Kimi through it (`captureViaReverse`, upstream `api.kimi.com`, no diagnostic
  CA); the stale `api.moonshot.ai` rule is fixed to `api.kimi.com` +
  `/chat/completions` + the probe `bodyIncludes`.
- `b3472e08` `feat(kimi-provider): capture native request via acp default
  agent` — new `kimi-native-request-capture-service.ts` clones the user's
  `~/.kimi-code` (config.toml + credentials + device_id) into a temp home,
  rewrites every `[providers.*]` `base_url` to the bridge (pure
  `kimi-capture-config-rewrite.ts` helper, preserving the URL path), and runs
  `kimi acp` with the DEFAULT agent (not the CodeAI managed agent) through the
  wire bridge/router: initialize -> session/new -> session/prompt(probe).

## Build

- The packaged rebuild continues the user-directed variant B (chat,
  2026-07-03): the Kimi probe reaches `api.kimi.com` through the local bridge.
- `npm run package:mac` for `darwin/arm64`, unsigned by configuration.
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` rebuilt for
  this scope.

## Verification State

- Both feature commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 76
  static tests including the reverse-bridge, orchestrator reverse-path and
  config-rewrite unit tests).
- Pre-packaging end-to-end smoke of the REAL compiled service against a local
  stub (the stub does NOT forward, so zero vendor tokens): the service cloned
  `~/.kimi-code`, rewrote the provider base_url to the stub, spawned the real
  `kimi acp` default-agent process, and the captured POST
  `/coding/v1/chat/completions` carried the native Kimi wrapping — system "You
  are Kimi Code CLI..." (~3.7k tok) + 23 native tools (Agent, AgentSwarm,
  AskUserQuestion, Bash, CreateGoal, Cron*, Edit, EnterPlanMode/ExitPlanMode,
  FetchURL, GetGoal, Glob, Grep, Read, Skill, Task*, TodoList, WebSearch,
  Write) + the probe in messages.
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`). Expected for Kimi: the dump shows the
  native "You are Kimi Code CLI..." system prompt and the 23-tool set on the
  selected model. This request DOES reach `api.kimi.com` (variant B). With
  Claude (interactive CLI) and Codex done, completing Kimi delivers the three
  native pairs for Phase R.
