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
assert.match(source, /"gpt-5\.2": \["low", "medium", "high", "xhigh"\]/u);
assert.match(
  source,
  /"gpt-5\.3-codex-spark": \["low", "medium", "high", "xhigh"\]/u
);
assert.match(source, /"gpt-5\.3-codex-spark": "medium"/u);
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
assert.match(facadeSource, /uiEngineId: "google-gtx"/u);
assert.match(facadeSource, /getLocalizationTranslationEngines/u);
assert.match(facadeSource, /shouldSyncLocalization/u);
assert.match(
  facadeSource,
  /firstText\(localization\.uiEngineId, localization\.engineId\)/u
);
assert.match(facadeSource, /reasoning: _reasoning/u);
assert.doesNotMatch(localizationSyncKeySource, /reasoningEngineId/u);
