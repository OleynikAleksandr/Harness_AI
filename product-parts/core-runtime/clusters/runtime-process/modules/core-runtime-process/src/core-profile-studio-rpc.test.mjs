import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rpcSource = readFileSync(
  new URL("./core-profile-studio-rpc.ts", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("./core-runtime-api.ts", import.meta.url),
  "utf8"
);
const bridgeSource = readFileSync(
  new URL(
    "../../../../../../application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs",
    import.meta.url
  ),
  "utf8"
);
const preloadSource = readFileSync(
  new URL(
    "../../../../../../application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs",
    import.meta.url
  ),
  "utf8"
);

for (const method of [
  "list-profile-studio-targets",
  "list-profile-studio-profiles",
  "get-profile-studio-profile",
  "create-profile-studio-draft",
  "approve-profile-studio-draft",
]) {
  assert.match(apiSource, new RegExp(`case "${method}"`, "u"));
  assert.match(bridgeSource, new RegExp(`core:${method}`, "u"));
}

assert.match(rpcSource, /class CoreProfileStudioRpcFacade/u);
assert.match(rpcSource, /profileLifecycle\.createDraft\(\{/u);
assert.match(rpcSource, /createProfileCreatorSession\(\{/u);
assert.match(
  rpcSource,
  /`session-\$\{target\.target\.providerId\}-\$\{randomUUID\(\)\}`/u
);
assert.match(rpcSource, /providerId === "kimi-client"/u);
assert.match(rpcSource, /content hash are required/u);
assert.match(apiSource, /type: "profile-studio:updated"/u);
assert.match(preloadSource, /onProfileStudioUpdated/u);
assert.match(preloadSource, /payload\?\.type !== "profile-studio:updated"/u);

console.log("core-profile-studio-rpc tests: OK");
