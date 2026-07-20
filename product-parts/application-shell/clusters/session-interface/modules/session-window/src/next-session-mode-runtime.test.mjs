import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const windowSource = readFileSync(
  new URL("./session-window-facade.tsx", import.meta.url),
  "utf8"
);
const stepSource = readFileSync(
  new URL("./session-profile-step.tsx", import.meta.url),
  "utf8"
);

// The new-session flow submits the profile choice through nextSessionMode:
// native stays the raw baseline, a managed selection carries the profile id.
assert.match(
  windowSource,
  /\? \{ invocationMode: "native", requestMode: "raw" \}/u
);
assert.match(windowSource, /invocationMode: "managed",/u);
assert.match(windowSource, /managedProfileId: profileId,/u);
assert.match(windowSource, /SessionProfileStep/u);

// The profile step is Core-read-model driven: list + preselection from Core.
assert.match(
  stepSource,
  /listSessionProfiles\(\{ modelId: model, providerId: provider\.id \}\)/u
);
assert.match(stepSource, /lastSelectedProfileByProvider\[provider\.id\]/u);
assert.match(windowSource, /model=\{resolveProviderModel\(/u);

// The legacy Next Session Mode panel/dialog is gone: the profile step owns
// the selection surface.
assert.doesNotMatch(windowSource, /NextSessionModePanel/u);
