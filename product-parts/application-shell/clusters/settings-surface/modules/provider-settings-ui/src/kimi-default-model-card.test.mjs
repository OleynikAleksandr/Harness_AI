import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const modelOptionsSource = readFileSync(
  new URL("./settings-model-options.ts", import.meta.url),
  "utf8"
);
const tabContentSource = readFileSync(
  new URL("./settings-tab-content.tsx", import.meta.url),
  "utf8"
);
const kimiTabSource = tabContentSource.slice(
  tabContentSource.indexOf('if (activeTab === "kimi")'),
  tabContentSource.indexOf('if (activeTab === "glmClient")')
);

assert.match(modelOptionsSource, /import \{ KIMI_CLIENT_MODELS \}/u);
assert.match(modelOptionsSource, /kimiClient: KIMI_CLIENT_MODELS/u);
assert.match(kimiTabSource, /<KimiClientApiKeyCard/u);
assert.match(kimiTabSource, /<DefaultModelCard/u);
assert.match(
  kimiTabSource,
  /next\.providers\.kimiClient\.defaultModel = defaultModel/u
);
assert.match(kimiTabSource, /PROVIDER_MODEL_OPTIONS\.kimiClient/u);
assert.match(kimiTabSource, /settings\.provider\.kimiClient\.defaultModel/u);

console.log("Kimi default model card tests passed");
