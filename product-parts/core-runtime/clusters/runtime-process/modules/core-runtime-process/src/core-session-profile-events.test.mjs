import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rpcSource = readFileSync(
  new URL("./core-session-profile-rpc.ts", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("./core-runtime-api.ts", import.meta.url),
  "utf8"
);

// The RPC surface and the watcher share one store and one event type name.
assert.match(rpcSource, /export const sessionProfileStore/u);
assert.match(
  rpcSource,
  /SESSION_PROFILES_UPDATED_EVENT_TYPE = "session-profiles:updated"/u
);
assert.doesNotMatch(rpcSource, /const profileStore =/u);

// subscribe() forwards watcher notifications as core events and unsubscribes.
assert.match(apiSource, /sessionProfileStore\.watchProfiles\(/u);
assert.match(
  apiSource,
  /listener\(\{ type: SESSION_PROFILES_UPDATED_EVENT_TYPE \}\)/u
);
assert.match(apiSource, /unsubscribeProfiles\(\);/u);

console.log("core-session-profile-events tests: OK");
