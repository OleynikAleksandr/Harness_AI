# Capture Certificates Module

## Responsibility

Own the diagnostic TLS material for native request capture: a local
certificate authority plus per-host leaf certificates that let the capture
proxy terminate TLS for a provider host, and the environment hints that make
a provider client trust that CA for the capture run only.

The CA and host certs live under
`<harness home>/diagnostics/native-request-capture/certs` (`HARNESS_AI_HOME`
aware) and are reused across runs. The CA is never installed into the OS
trust store — it is trusted only through the returned env hints.

Behavior ported from the CodeAI-Hub `native-request-capture-certificates`
module. The `openssl` invocation is injectable (`runOpenSsl`) so the store is
testable without a real toolchain.

## Public Facade

`capture-certificates-facade.ts`

## Inputs

- Optional `rootDir` (defaults to the Harness home diagnostics certs dir),
  `opensslPath` (defaults to `openssl` on PATH), and `runOpenSsl` override.
- A provider hostname (e.g. `api.anthropic.com`, `chatgpt.com`).

## Outputs

- `NativeCaptureCertificateStore.prepareHostCredentials(hostname)`: ensures
  the CA and a host certificate exist (creating them once), and returns the
  `NativeCaptureCertificateBundle` — CA cert path, TLS credentials
  (`ca`/`cert`/`key` buffers) for the proxy's TLS server, and env hints
  (`NODE_EXTRA_CA_CERTS` for Node clients like Claude, `SSL_CERT_FILE` for
  non-Node clients like Codex, `REQUESTS_CA_BUNDLE` for Python clients).

## Owned Paths

- `module.md`
- `src/**`
