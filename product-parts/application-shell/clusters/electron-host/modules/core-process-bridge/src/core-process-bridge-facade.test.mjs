import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./core-process-bridge-facade.mjs", import.meta.url),
  "utf8"
);
const supervisorSource = readFileSync(
  new URL("./core-process-supervisor.mjs", import.meta.url),
  "utf8"
);
const preloadSource = readFileSync(
  new URL("../../app-bootstrap/src/preload.cjs", import.meta.url),
  "utf8"
);

assert.match(source, /harness-ai:core:get-session-events/u);
assert.match(
  source,
  /"harness-ai:core:get-localization-runtime-payload":\s*"get-localization-runtime-payload"/u
);
assert.match(
  source,
  /"harness-ai:core:translate-dynamic-text":\s*"translate-dynamic-text"/u
);
assert.match(
  source,
  /"harness-ai:core:rollback-session-turns":\s*"rollback-session-turns"/u
);
assert.match(source, /"harness-ai:core:rename-session":\s*"rename-session"/u);
assert.match(
  source,
  /"harness-ai:core:respond-provider-interaction":\s*"respond-provider-interaction"/u
);
assert.match(
  source,
  /"harness-ai:core:regenerate-session-title":\s*"regenerate-session-title"/u
);
assert.match(preloadSource, /renameSession: \(request\)/u);
assert.match(preloadSource, /harness-ai:core:rename-session/u);
assert.match(preloadSource, /regenerateSessionTitle: \(request\)/u);
assert.match(preloadSource, /harness-ai:core:regenerate-session-title/u);
assert.match(preloadSource, /respondProviderInteraction: \(request\)/u);
assert.match(preloadSource, /harness-ai:core:respond-provider-interaction/u);
assert.match(source, /createCoreProcessSupervisor\(repositoryRoot\)/u);
assert.match(source, /await coreSupervisor\.start\(\)/u);
assert.match(source, /await coreSupervisor\.restart\(\)/u);
assert.match(source, /async stopCore\(\)/u);
assert.match(source, /await coreSupervisor\.stop\(\)/u);
assert.match(source, /catch \(error\)[\s\S]*ok: false/u);
assert.match(source, /toErrorMessage\(error\)/u);
assert.match(source, /\/api\/v1\/rpc/u);
assert.match(source, /\/api\/v1\/events/u);
assert.doesNotMatch(source, /loadRuntime/u);
assert.doesNotMatch(source, /provider-runtime\/clusters\/provider-adapters/u);
assert.doesNotMatch(source, /sessionRequestHandlerFacade/u);
assert.match(supervisorSource, /ELECTRON_RUN_AS_NODE/u);
assert.match(supervisorSource, /"\/api\/v1\/health"/u);
assert.match(supervisorSource, /"\/api\/v1\/shutdown"/u);
// Restart must force-terminate a hung core, not rely on HTTP shutdown alone.
assert.match(supervisorSource, /process\.kill/u);
assert.match(supervisorSource, /SIGKILL/u);
