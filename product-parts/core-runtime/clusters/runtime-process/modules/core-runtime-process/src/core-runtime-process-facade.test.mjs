import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./core-runtime-process-facade.ts", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("./core-runtime-api.ts", import.meta.url),
  "utf8"
);
const entrySource = readFileSync(
  new URL("./core-runtime-process-entry.ts", import.meta.url),
  "utf8"
);
const lifecycleSource = readFileSync(
  new URL("./core-provider-lifecycle.ts", import.meta.url),
  "utf8"
);
const adapterRegistrationSource = readFileSync(
  new URL("./core-provider-adapter-registration.ts", import.meta.url),
  "utf8"
);

assert.match(source, /"\/api\/v1\/health"/u);
assert.match(source, /"\/api\/v1\/status"/u);
assert.match(source, /"\/api\/v1\/events"/u);
assert.match(source, /"\/api\/v1\/rpc"/u);
assert.match(source, /"\/api\/v1\/shutdown"/u);
assert.match(source, /createServer/u);
assert.match(source, /options\.onShutdown\?\.\(\)/u);
assert.match(source, /process\.env\.CORE_PORT/u);
assert.match(source, /text\/event-stream/u);
assert.match(adapterRegistrationSource, /new ClaudeProviderFacade/u);
assert.match(adapterRegistrationSource, /new CodexProviderFacade/u);
assert.match(adapterRegistrationSource, /new CodexUcProviderFacade/u);
assert.match(lifecycleSource, /providerRegistryFacade\.clearAdapters/u);
assert.match(lifecycleSource, /providerReadinessRegistryFacade\.subscribe/u);
assert.match(lifecycleSource, /type: "provider:status"/u);
assert.doesNotMatch(
  lifecycleSource,
  /sessionEventStreamFacade\.publish\(\{\s+payload:\s+\{\s+providerId/u
);
assert.match(apiSource, /sessionRequestHandlerFacade\.createSession/u);
assert.match(apiSource, /"rollback-session-turns"/u);
assert.match(apiSource, /sessionRequestHandlerFacade\.rollbackSessionTurns/u);
assert.match(entrySource, /api: coreRuntimeApi/u);
