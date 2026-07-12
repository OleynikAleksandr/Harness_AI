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
// delete-session RPC delegates all artifact cleanup (events, overlays,
// provider files) to the request-handler cascade; the API keeps no local
// overlay store or per-root cleanup helpers.
assert.match(
  apiSource,
  /case "delete-session": \{[\s\S]*?deleteSession\(sessionId\);\s*\}/u
);
assert.doesNotMatch(apiSource, /ReasoningTranslationOverlayStore/u);
assert.doesNotMatch(apiSource, /deleteReasoningTranslationOverlays/u);
assert.doesNotMatch(apiSource, /deleteProviderSessionArtifacts/u);
