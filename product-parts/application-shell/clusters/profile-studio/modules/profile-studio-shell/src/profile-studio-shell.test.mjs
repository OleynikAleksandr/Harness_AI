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
assert.match(shellSource, /selectionChanged/u);
assert.match(shellSource, /setProfiles\(\(current\) => \[/u);
assert.match(
  shellSource,
  /onAddCreatorSession\(result\.session\);\s+selectProfile\(createdProfile\)/u
);
assert.doesNotMatch(shellSource, /DialogPanel/u);
assert.doesNotMatch(shellSource, /ReferenceInputPanel/u);

assert.match(sessionSidebarSource, /onOpenProfileStudio/u);
assert.match(sessionSidebarSource, />Profile Studio</u);
assert.match(
  sessionWindowSource,
  /await refreshSessions\("profile-studio"\);\s+setApplicationMode\("studio"\)/u
);
assert.doesNotMatch(
  sessionWindowSource,
  /for \(const session of \[\.\.\.studioSessions\]\.reverse\(\)\)/u
);
assert.match(
  sessionWindowSource,
  /applicationMode === "studio" && !detachedMode/u
);
assert.match(sessionWindowSource, /onReturn=\{returnToSessions\}/u);
assert.match(sessionWindowSource, /refreshSessions\(activeWorkspace\.id\)/u);
assert.match(
  sessionWindowSource,
  /applicationMode === "studio" \? "profile-studio" : activeWorkspaceId/u
);
assert.match(shellSource, /resolveInitialSelection/u);
assert.match(shellSource, /initialCreatorSessionRef/u);
assert.match(shellSource, /profileId: session\.sessionPurpose\.profileId/u);

console.log("profile-studio shell tests: OK");
