import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./openrouter-settings-card.tsx", import.meta.url),
  "utf8"
);

// Collapsed matches: only the selected model card stays visible after a pick.
assert.match(source, /resultsCollapsed/u);
assert.match(source, /models\.filter\(\(model\) => model\.id === value\)/u);
assert.match(source, /visibleModels\.map/u);

// Picking a model collapses the list; typing expands it again.
assert.match(source, /setResultsCollapsed\(true\);\s*\n\s*onChange\(/u);
assert.match(source, /setResultsCollapsed\(false\)/u);

// The refresh control re-runs the search by bumping the request nonce.
assert.match(source, /settings-model-search-refresh/u);
assert.match(source, /nonce: previous\.nonce \+ 1/u);
assert.match(source, /settings\.openRouter\.searchRefresh/u);

// The row renderer and description translation hook live in the split file.
assert.match(source, /from "\.\/openrouter-model-row\.js"/u);
assert.doesNotMatch(source, /function OpenRouterModelRow/u);

const rowSource = readFileSync(
  new URL("./openrouter-model-row.tsx", import.meta.url),
  "utf8"
);
assert.match(rowSource, /export function OpenRouterModelRow/u);
assert.match(source, /useTranslatedModelDescriptions\(models\)/u);

// A stored endpoint missing from the live list stays visible as an
// unavailable selected row (only once endpoints loaded without error).
assert.match(
  source,
  /const unavailableEndpointTag = resolveUnavailableEndpointTag/u
);
assert.match(source, /automatic: usesAutomaticEndpoint,/u);
assert.match(source, /failed: Boolean\(error\),\s*loading: endpointsLoading,/u);
assert.match(source, /<OpenRouterUnavailableEndpointRow/u);
assert.match(source, /from "\.\/openrouter-endpoint-rows\.js"/u);
assert.doesNotMatch(source, /function formatEndpointMetric/u);
const formatSource = readFileSync(
  new URL("./openrouter-endpoint-rows.tsx", import.meta.url),
  "utf8"
);
assert.match(formatSource, /export function selectFastestResult/u);
assert.match(formatSource, /export function resolveUnavailableEndpointTag/u);
assert.match(formatSource, /settings\.openRouter\.endpointUnavailable/u);
