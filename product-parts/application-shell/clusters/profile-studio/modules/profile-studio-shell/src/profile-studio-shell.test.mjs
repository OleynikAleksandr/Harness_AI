import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shellSource = readFileSync(
  new URL("./profile-studio-shell-facade.tsx", import.meta.url),
  "utf8"
);
const sessionWindowSource = readFileSync(
  new URL(
    "../../../../session-interface/modules/session-window/src/session-window-facade.tsx",
    import.meta.url
  ),
  "utf8"
);
const sessionSidebarSource = readFileSync(
  new URL(
    "../../../../session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx",
    import.meta.url
  ),
  "utf8"
);

for (const facade of [
  "ProfileStudioSidebarFacade",
  "SessionSurfaceFacade",
  "ProfileStudioInspectorFacade",
]) {
  assert.match(shellSource, new RegExp(`<${facade}`, "u"));
}
assert.match(shellSource, /listProfileStudioTargets/u);
assert.match(shellSource, /listProfileStudioProfiles/u);
assert.match(shellSource, /getProfileStudioProfile/u);
assert.match(shellSource, /createProfileStudioDraft/u);
assert.match(shellSource, /approveProfileStudioDraft/u);
assert.match(shellSource, /onProfileStudioUpdated/u);
assert.doesNotMatch(shellSource, /DialogPanel/u);
assert.doesNotMatch(shellSource, /ReferenceInputPanel/u);

assert.match(sessionSidebarSource, /onOpenProfileStudio/u);
assert.match(sessionSidebarSource, />Profile Studio</u);
assert.match(sessionWindowSource, /listSessions\("profile-studio"\)/u);
assert.match(
  sessionWindowSource,
  /applicationMode === "studio" && !detachedMode/u
);
assert.match(sessionWindowSource, /onReturn=\{returnToSessions\}/u);
assert.match(sessionWindowSource, /refreshSessions\(activeWorkspace\.id\)/u);

console.log("profile-studio shell tests: OK");
