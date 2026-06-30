import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./core-localization-runtime.ts", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("./core-runtime-api.ts", import.meta.url),
  "utf8"
);

assert.match(source, /path\.join\(harnessHome\(\), "Localization"\)/u);
assert.match(
  source,
  /ui_labels: firstText\(\s*categories\.uiLabels,\s*categories\.uiInterface,\s*categories\.workflowTerms\s*\)/u
);
assert.match(source, /new ProviderTranslationEnginesFacade\(\)/u);
assert.match(apiSource, /materializeCoreLocalizationRuntimePayload\(/u);
