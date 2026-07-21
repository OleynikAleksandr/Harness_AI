import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./profile-studio-settings-ui-facade.tsx", import.meta.url),
  "utf8"
);
const tabModelSource = readFileSync(
  new URL(
    "../../provider-settings-ui/src/settings-model-options.ts",
    import.meta.url
  ),
  "utf8"
);
const tabContentSource = readFileSync(
  new URL(
    "../../provider-settings-ui/src/settings-tab-content.tsx",
    import.meta.url
  ),
  "utf8"
);

assert.match(source, /PROFILE_CREATOR_AGENT_OPTIONS/u);
assert.match(source, /ProfileCreatorAgentProviderId/u);
assert.match(source, /settings\.profileStudio\.defaultCreatorAgent/u);
assert.match(source, /settings\.profileStudio\.creatorAgent/u);
assert.match(source, /selected\.id/u);
assert.match(source, /selected\.model/u);
assert.match(source, /selected\.reasoningEffort/u);
assert.match(
  tabModelSource,
  /\{ id: "profileStudio", label: "Profile Studio" \},\n\s+\{ id: "general", label: "General" \}/u
);
assert.match(tabContentSource, /activeTab === "profileStudio"/u);
assert.match(tabContentSource, /ProfileStudioSettingsUiFacade/u);
assert.match(
  tabContentSource,
  /next\.profileStudio\.defaultCreatorAgentProviderId =\s+defaultCreatorAgentProviderId/u
);

console.log("Profile Studio settings UI tests: OK");
