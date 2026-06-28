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

assert.match(source, /harness-ai:core:get-session-events/u);
assert.match(source, /sessionRequestHandlerFacade\s*\.\s*refreshUsageLimits/u);
assert.match(source, /catch\(\(\) => undefined\)/u);
assert.match(source, /createCoreProcessSupervisor\(repositoryRoot\)/u);
assert.match(source, /await coreSupervisor\.start\(\)/u);
assert.match(source, /await coreSupervisor\.restart\(\)/u);
assert.match(supervisorSource, /ELECTRON_RUN_AS_NODE/u);
assert.match(supervisorSource, /"\/api\/v1\/health"/u);
assert.match(supervisorSource, /"\/api\/v1\/shutdown"/u);
