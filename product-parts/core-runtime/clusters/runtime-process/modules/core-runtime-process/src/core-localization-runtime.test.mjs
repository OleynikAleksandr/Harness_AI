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
  /messages_for_the_user: firstText\(\s*categories\.systemFeedback,\s*categories\.messagesForTheUser\s*\)/u
);
assert.match(
  source,
  /ui_helper_text: firstText\(\s*categories\.userGuidance,\s*categories\.uiHelperText\s*\)/u
);
assert.match(
  source,
  /ui_labels: firstText\(\s*categories\.uiInterface,\s*categories\.uiLabels,\s*categories\.workflowTerms\s*\)/u
);
assert.match(
  source,
  /new ProviderTranslationEnginesFacade\(\{\s*engines: createProviderTranslationEngines\(/u
);
assert.match(apiSource, /materializeCoreLocalizationRuntimePayload\(/u);
assert.match(apiSource, /ReasoningTranslationOverlayStore/u);
assert.match(apiSource, /private readonly reasoningOverlayStore/u);
assert.match(apiSource, /this\.deleteReasoningTranslationOverlays\(session\)/u);
assert.match(
  apiSource,
  /deleteSessionOverlays\(\s*session\.workspacePath,\s*session\.id\s*\)/u
);
