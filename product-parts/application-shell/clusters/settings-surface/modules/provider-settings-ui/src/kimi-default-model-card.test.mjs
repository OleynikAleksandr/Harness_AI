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

// Kimi rows come from the live catalog Core serves.
assert.doesNotMatch(modelOptionsSource, /KIMI_CLIENT_MODELS/u);
assert.doesNotMatch(modelOptionsSource, /kimiClient:/u);
assert.match(kimiTabSource, /<KimiClientApiKeyCard/u);
assert.match(kimiTabSource, /<DefaultModelCard/u);
assert.match(
  kimiTabSource,
  /next\.providers\.kimiClient\.defaultModel = defaultModel/u
);
assert.match(kimiTabSource, /modelCatalogs\.kimiClient\.map\(\(model\) =>/u);
assert.match(
  tabContentSource,
  /useTranslatedModelDescriptions\(\s*modelCatalogs\.kimiClient\s*\)/u
);
assert.match(kimiTabSource, /settings\.provider\.kimiClient\.defaultModel/u);

// Reasoning select per model row (native thinking level), bound to the
// workspace-projected kimiClient.reasoningByModel like the Grok card.
assert.doesNotMatch(kimiTabSource, /KIMI_REASONING_EFFORTS_BY_MODEL/u);
assert.match(kimiTabSource, /model\?\.reasoningEfforts \?\? \[\]/u);
assert.match(kimiTabSource, /model\?\.defaultReasoningEffort/u);
assert.match(kimiTabSource, /<ReasoningEffortSelect/u);
assert.match(
  kimiTabSource,
  /next\.providers\.kimiClient\.reasoningByModel\[modelId\] =/u
);

// The shared row-control slot flows through DefaultModelCard into ModelRows.
const providerCardsSource = readFileSync(
  new URL("./settings-provider-cards.tsx", import.meta.url),
  "utf8"
);
const referenceControlsSource = readFileSync(
  new URL("./settings-reference-controls.tsx", import.meta.url),
  "utf8"
);
assert.match(
  providerCardsSource,
  /rowControl\?: Parameters<typeof ModelRows>/u
);
assert.match(
  referenceControlsSource,
  /rowControl\?: \(optionId: string\) => ReactNode/u
);
assert.match(referenceControlsSource, /settings-model-row--with-control/u);

console.log("Kimi default model card tests passed");
