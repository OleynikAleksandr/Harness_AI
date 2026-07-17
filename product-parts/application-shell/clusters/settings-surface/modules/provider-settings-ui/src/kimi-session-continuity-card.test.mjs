import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tabContentSource = readFileSync(
  new URL("./settings-tab-content.tsx", import.meta.url),
  "utf8"
);
const kimiTabSource = tabContentSource.slice(
  tabContentSource.indexOf('if (activeTab === "kimi")'),
  tabContentSource.indexOf('if (activeTab === "glmClient")')
);

// The Kimi tab reuses the shared continuity card bound to the stored
// workspace threshold, mirroring the Claude/Codex/Grok tabs.
assert.match(kimiTabSource, /<SessionContinuityCard/u);
assert.match(
  kimiTabSource,
  /next\.providers\.kimiClient\.sessionContinuity\.remainingPercentThreshold =/u
);
assert.match(
  kimiTabSource,
  /settings\.provider\.kimiClient\.sessionContinuity/u
);
assert.match(kimiTabSource, /"Kimi Session Continuity"/u);

console.log("Kimi session continuity card tests passed");
