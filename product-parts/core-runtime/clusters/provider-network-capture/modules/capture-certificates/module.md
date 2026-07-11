# Capture Certificates Module

## Responsibility

Own the diagnostic TLS material for native request capture: a local
certificate authority plus per-host leaf certificates that let the capture
proxy terminate TLS for a provider host, and the environment hints that make
a provider client trust that CA for the capture run only.

The CA and host certs live under
`<harness home>/diagnostics/native-request-capture/certs` (`HARNESS_AI_HOME`
aware) and are reused across runs while their X.509 validity extends beyond a
24-hour renewal window. Host leaves last seven days; the CA lasts thirty days.
An expired/near-expiry host leaf is regenerated independently. An
expired/near-expiry or unreadable CA clears every CA/host artifact in the
dedicated certificate directory and regenerates the CA plus the requested
leaf, so no leaf signed by the retired CA survives. The CA is never installed
into the OS trust store — it is trusted only through the returned env hints.

Behavior ported from the CodeAI-Hub `native-request-capture-certificates`
module. The `openssl` invocation is injectable (`runOpenSsl`) so the store is
testable without a real toolchain.

## Public Facade

`capture-certificates-facade.ts`

## Inputs

- Optional `rootDir` (defaults to the Harness home diagnostics certs dir),
  `opensslPath` (defaults to `openssl` on PATH), `runOpenSsl` override, and
  test clock (`now`).
- A provider hostname (e.g. `api.anthropic.com`, `chatgpt.com`).

## Outputs

- `NativeCaptureCertificateStore.prepareHostCredentials(hostname)`: ensures
  the CA and a current host certificate exist (rotating stale material), and returns the
  `NativeCaptureCertificateBundle` — CA cert path, TLS credentials
  (`ca`/`cert`/`key` buffers) for the proxy's TLS server, and env hints
  (`NODE_EXTRA_CA_CERTS` for Node clients like Claude, `SSL_CERT_FILE` for
  non-Node clients like Codex, `REQUESTS_CA_BUNDLE` for Python clients).

## Owned Paths

- `module.md`
- `src/**`
