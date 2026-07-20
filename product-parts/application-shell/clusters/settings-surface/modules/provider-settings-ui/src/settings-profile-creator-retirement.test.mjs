import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tabModelSource = readFileSync(
  new URL("./settings-model-options.ts", import.meta.url),
  "utf8"
);
const tabContentSource = readFileSync(
  new URL("./settings-tab-content.tsx", import.meta.url),
  "utf8"
);
const sessionProfileStepSource = readFileSync(
  new URL(
    "../../../../session-interface/modules/session-window/src/session-profile-step.tsx",
    import.meta.url
  ),
  "utf8"
);
const sessionWindowSource = readFileSync(
  new URL(
    "../../../../session-interface/modules/session-window/src/session-window-facade.tsx",
    import.meta.url
  ),
  "utf8"
);

assert.doesNotMatch(tabModelSource, /profileCreator/u);
assert.doesNotMatch(tabModelSource, /Profile Creator/u);
assert.doesNotMatch(tabContentSource, /ProfileSettingsUiFacade/u);
assert.doesNotMatch(tabContentSource, /profile-settings-ui/u);

assert.match(sessionProfileStepSource, /listSessionProfiles/u);
assert.match(sessionProfileStepSource, /session-profiles:updated/u);
assert.match(sessionProfileStepSource, /NATIVE_PROFILE_ID/u);
assert.match(sessionWindowSource, /managedProfileId: profileId/u);
assert.match(sessionWindowSource, /managedProfileSelection: "user"/u);

console.log("settings Profile Creator retirement tests: OK");
