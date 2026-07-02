# Provider Network Capture Cluster

## Boundary

Owns the local, dev-time diagnostic capture of a provider's native HTTPS
request — the actual system prompt and tool schemas the vendor client would
send — without forwarding anything upstream. This is a standalone diagnostic
instrument over the app: session profiles v2 is one consumer (native
reference dumps for prompt/tooling analysis), but the cluster is useful on
its own.

Contract source: `docs/architecture/SessionProfilesV2.md` (decision 5),
behavior ported from the CodeAI-Hub `Provider Native Request Capture`
architecture (`Plans/Archive/Provider_Native_Request_Capture_Architecture.md`).

## Owned Modules

- `capture-artifacts`

## Facade Rule

The cluster owns the capture-and-abort proxy, the diagnostic certificate
store, the artifact writer, and capture orchestration. It never forwards a
captured request to the vendor. Provider-specific environment injection
(pointing a provider client at the local proxy) lives in the provider
adapters (Provider Runtime); this cluster stays provider-neutral and receives
the captured request from the proxy. Renderer/client code only submits the
capture command and displays the Core-returned artifact paths.
