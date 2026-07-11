# Codex 0.144.1 Native Capture Recovery — 2026-07-11

## Failure evidence

The packaged Codex GPT-5.6 Sol capture at `2026-07-11T06-31-39-156Z` failed
with `target_not_seen`; its raw JSONL was empty. A controlled retry with
`NODE_DEBUG=tls` exposed the hidden cause:

`ERR_SSL_SSLV3_ALERT_CERTIFICATE_EXPIRED`

The cached diagnostic CA and `chatgpt.com` leaf were created on July 3 with a
seven-day lifetime and expired on July 10. The certificate store reused files
based only on existence, so it never rotated them. The proxy also discarded
the TLS error code/message, leaving the orchestrator to report the misleading
`target_not_seen` result.

## Repairs

- Cached X.509 material is validated before reuse with a 24-hour renewal
  window.
- Host leaves remain seven-day certificates and rotate independently.
- The CA is now valid for thirty days. Rotating an invalid/expiring CA clears
  all old CA/host material before issuing the requested leaf.
- TLS socket diagnostics retain a bounded, payload-free error code/message.
- Only certificate/CA trust signals become `tls_trust_failed`; incidental
  `ECONNRESET`/`EPIPE` sockets do not override the real capture outcome.
- HTTP path mismatches record only the pathname (query strings removed).
- Rejected WebSocket frames record structural metadata only: frame type,
  top-level keys, payload bytes, probe match, top-level-tools presence and tool
  count.

The first retry after certificate rotation showed a second compatibility
change. Codex 0.144.1 still used `WS /backend-api/codex/responses`, but both the
prewarm and real `response.create` frames omitted top-level `tools`. The legacy
`minimumToolCount: 1` filter therefore rejected the real turn. The compatible
filter now enforces the minimum only when a frame has a top-level `tools`
field; when the field is absent, the exact probe match identifies the real
turn. Legacy frames with `tools: []` remain rejected.

## Rotated certificate evidence

- Local CA: `notBefore=Jul 11 06:48:10 2026 GMT`,
  `notAfter=Aug 10 06:48:10 2026 GMT`.
- `chatgpt.com` leaf: `notBefore=Jul 11 06:48:11 2026 GMT`,
  `notAfter=Jul 18 06:48:11 2026 GMT`.

## Successful live capture

Artifact stem:

`2026-07-11T06-58-54-836Z-codex-gpt-5.6-sol-native-request`

- Result: `ok: true`.
- Raw JSONL: 124,629 bytes, one canonical `request_captured` record.
- `sentUpstream: true`.
- Transport: `WS`.
- Path: `/backend-api/codex/responses`.
- Model: `gpt-5.6-sol`.
- Core/app-server `turn/start.effort`: `ultra`.
- Upstream `response.create.reasoning`: `{ effort: "max", summary: "detailed",
  context: "all_turns" }`.
- Top-level `tools`: absent (Codex 0.144.1 frame contract).
- Input items: 7.

The `ultra -> max` distinction is provider behavior, not a Harness downgrade.
The app-server model catalog defines Ultra as maximum reasoning with automatic
task delegation. Harness passes `ultra` to app-server `turn/start`; Codex owns
its orchestration and emits the underlying model call with wire effort `max`.
Native Request Capture intentionally preserves the actual upstream request.

## Verification

- Focused certificate, proxy and orchestrator tests passed.
- Repository architecture and typecheck gates passed.
- Every implementation commit passed the full commit suite (81 test groups).
- macOS package verification is recorded in the final section after the
  explicitly user-approved package rebuild.
