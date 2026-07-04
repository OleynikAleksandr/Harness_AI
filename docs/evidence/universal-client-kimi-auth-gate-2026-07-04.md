# Universal Client Kimi Auth-Gate Evidence - 2026-07-04

## Verdict

**PASSED / ACCEPTED.** The user ran a live Kimi session on the packaged
build (see `universal-client-kimi-package-2026-07-04.md`) with a Kimi Code
subscription key pasted into the new Settings card, and accepted the
result: Kimi works through OUR universal client end-to-end ("я проверил,
всё работает", 2026-07-04). No blocking findings were reported.

This settles the Phase 2 auth-gate question from
`docs/architecture/UniversalClient.md` section 3.6 with live proof: the
Kimi Code subscription channel accepts the subscription `api_key` from a
third-party client — ours — in a real turn-serving session (previously
only verified via OpenCode).

## Wire Facts (Core-owned, from the shipped code)

- Endpoint/base URL: `https://api.kimi.com/coding/v1`
  (`KIMI_DIALECT.baseUrl`, `kimi-client-provider-facade.ts`).
- Model id: `kimi-for-coding` — the single public Kimi Code coding model;
  the vendor rotates the backend behind it (`KIMI_MODEL`).
- Auth header: `Authorization: Bearer <subscription key>`; the key is
  resolved per turn from the provider-auth-store (`kimi-client`:
  settings section `providers.kimiClient.apiKey`, synced auth file
  `~/.harness-ai/providers/kimi-client/settings.json`, `KIMI_API_KEY` env
  fallback).
- Thinking form: `reasoning_content` deltas, normalized by the core
  dialect-streaming module onto the internal thinking channel.
- Tool choice: `auto_only`; usage is read from the final chunk
  (`usageFromAnyChunk: false`).

## Live-Run Confirmation Scope

The user's acceptance covers the end-to-end session flow on the packaged
app: key onboarding through the "Kimi For Coding API Key" Settings card,
session start on the visible Kimi (universal-client endpoint), and
working live turns. The acceptance was given as an overall "everything
works" verdict; per-item behavior details (exact usage/limit payloads,
auth/quota error bodies) were not reported item-by-item and can be
captured later from session logs if a dedicated record is ever needed.

## Consequences

- Kimi is the first provider LIVE on the universal client core; the ACP
  `kimi` provider stays internal for existing sessions only (full
  retirement remains the Phase 5 "kimi-provider afterlife" open item).
- Phase 2 (Universal Client Core And Kimi) is complete. Phases 3-5 (GLM
  migration, Local Models / OpenRouter endpoints, synthetic native
  profiles) remain milestone outlines to be broken down with the user.
