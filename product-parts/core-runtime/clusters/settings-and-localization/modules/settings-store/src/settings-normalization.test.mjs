import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./settings-normalization.ts", import.meta.url),
  "utf8"
);
const facadeSource = readFileSync(
  new URL("./settings-store-facade.ts", import.meta.url),
  "utf8"
);
const localizationSyncKeySource = facadeSource.slice(
  facadeSource.indexOf("function localizationSyncKey")
);

assert.match(source, /CODEX_REASONING_EFFORTS_BY_MODEL/u);
assert.match(
  source,
  /"gpt-5\.6-sol": \["low", "medium", "high", "xhigh", "max", "ultra"\]/u
);
assert.match(
  source,
  /"gpt-5\.6-terra": \["low", "medium", "high", "xhigh", "max", "ultra"\]/u
);
assert.match(
  source,
  /"gpt-5\.6-luna": \["low", "medium", "high", "xhigh", "max"\]/u
);
assert.match(source, /"gpt-5\.3-codex-spark": "high"/u);
assert.match(source, /defaultModel = "gpt-5\.6-sol"/u);
assert.match(source, /GROK_REASONING_EFFORTS_BY_MODEL/u);
assert.match(source, /"grok-4\.5": \["high", "medium", "low"\]/u);
assert.match(source, /"grok-composer-2\.5-fast": \[\]/u);
assert.match(source, /next\.providers\.grok\.defaultModel = "grok-4\.5"/u);
assert.match(
  source,
  /next\.providers\.grok\.reasoningByModel = Object\.fromEntries/u
);
assert.doesNotMatch(source, /gpt-5\.2/u);
assert.match(source, /supportsCodexReasoningSummary/u);
assert.match(source, /CODEX_MODELS_WITHOUT_REASONING_SUMMARY/u);
assert.match(source, /resolveCodexReasoningEffort/u);
assert.match(source, /return null/u);
assert.match(source, /GLM_CLIENT_MODEL_IDS/u);
assert.match(source, /next\.providers\.glmClient\.defaultModel = "glm-5\.2"/u);
assert.match(source, /next\.providers\.glmClient\.reasoningEffort = "max"/u);
assert.match(
  source,
  /next\.providers\.codex\.reasoningByModel = Object\.fromEntries/u
);
assert.match(
  facadeSource,
  /glmClient: \{\n\s+apiKey: "",\n\s+defaultModel: "glm-5\.2",\n\s+reasoningEffort: "max",\n\s+\}/u
);
assert.match(
  facadeSource,
  /grok: \{\n\s+\.\.\.commonProvider\("grok-4\.5"\),\n\s+reasoningByModel: \{ "grok-4\.5": "high" \},\n\s+\}/u
);
assert.match(source, /normalizeLocalBaseUrl/u);
assert.match(source, /normalizeContextLengthByModel/u);
assert.match(
  source,
  /LOCAL_MODELS_DEFAULT_BASE_URL = "http:\/\/127\.0\.0\.1:1234"/u
);
assert.match(
  facadeSource,
  /localModels: \{\n\s+baseUrl: "http:\/\/127\.0\.0\.1:1234",\n\s+contextLengthByModel: \{\},\n\s+defaultModel: "local-model",\n\s+\}/u
);
// The API key field is removed (user review fix 2026-07-05); only env
// fallbacks in the auth store may still supply a Bearer token.
assert.doesNotMatch(facadeSource, /localModels: \{\n\s+apiKey/u);
assert.doesNotMatch(source, /glmOpenCode/u);
assert.doesNotMatch(facadeSource, /glmOpenCode: \{/u);
assert.doesNotMatch(facadeSource, /"glm-opencode"/u);
// The retired glm-native section left the schema with the 2026-07-05 legacy
// cleanup; stored files with the section load fine (unknown keys are ignored
// structurally) and the save projections drop it on the next save.
assert.doesNotMatch(source, /glmNative/u);
assert.doesNotMatch(
  facadeSource,
  /glmNative: \{\n\s+\.\.\.connectionProvider/u
);
assert.match(facadeSource, /uiEngineId: "google-gtx"/u);
assert.match(facadeSource, /getLocalizationTranslationEngines/u);
assert.match(facadeSource, /shouldSyncLocalization/u);
assert.match(
  facadeSource,
  /firstText\(localization\.uiEngineId, localization\.engineId\)/u
);
assert.match(facadeSource, /reasoning: _reasoning/u);
assert.doesNotMatch(localizationSyncKeySource, /reasoningEngineId/u);
