# Kimi Client Provider Module

## Responsibility

The thin Kimi endpoint for the Core universal client. Holds Kimi's dialect
specifics — the Kimi Code subscription coding endpoint
(`api.kimi.com/coding/v1`), the `kimi-for-coding` model, and the
`reasoning_content` thinking form — and builds the `ClientTurnRequest` that the
Core universal-client agent loop runs. This module stays Kimi-specific: it does
NOT own the agent loop, tool execution or streaming (those are the Core
`universal-client` cluster); the Core session route wires the loop, the built-in
tool source and this endpoint together. The Kimi Code subscription channel
accepts a plain API key from a third-party client (verified via OpenCode's
`kimi-for-coding` provider), so onboarding is key-only.

Contract source: `docs/architecture/UniversalClient.md` (sections 3.3, 3.6),
and the Phase 2 Kimi rollout/migration note in `.harness/plans/todo-plan.md`.

## Public Facade

`kimi-client-provider-facade.ts`

## Inputs

- `KimiTurnInput`: the subscription API key, the message history, the available
  tool descriptors, an optional model override, and an optional abort signal.

## Outputs

- `KIMI_DIALECT`: the Kimi `DialectProfile` (base URL, `reasoning_content`
  thinking, `auto_only` tool choice).
- `KIMI_MODEL`: `kimi-for-coding`.
- `buildKimiTurnRequest(input)`: the Core `ClientTurnRequest` for a Kimi turn
  (defaults the model, attaches the dialect and key).

## Owned Paths

- `module.md`
- `src/**`
