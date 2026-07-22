import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const creationSource = readFileSync(
  new URL("./session-creation.ts", import.meta.url),
  "utf8"
);
const facadeSource = readFileSync(
  new URL("./session-request-handler-facade.ts", import.meta.url),
  "utf8"
);
const turnOptionsSource = readFileSync(
  new URL("./provider-turn-options.ts", import.meta.url),
  "utf8"
);

assert.match(creationSource, /new ProfileStudioAgentFacade\(\)/u);
assert.match(creationSource, /new ProfileStudioCreatorProfileFacade\(\)/u);
assert.match(creationSource, /defaultCreatorAgentProviderId/u);
assert.match(creationSource, /categories\.systemFeedback\.trim\(\)/u);
assert.match(creationSource, /defaultLanguage\.trim\(\)/u);
assert.match(creationSource, /PROFILE_CREATOR_AGENT_OPTIONS\.find/u);
assert.match(creationSource, /creatorProfileLoader\.load/u);
assert.match(creationSource, /modelId: request\.model/u);
assert.match(creationSource, /modelId: creatorOption\.model/u);
assert.match(
  creationSource,
  /systemPrompt: creatorProfileLoader\.composeEffectiveSystemPrompt/u
);
assert.match(creationSource, /communicationLanguage/u);
assert.match(creationSource, /model: spec\.modelId/u);
assert.match(creationSource, /providerId: spec\.providerId/u);
assert.match(creationSource, /profileCreatorProviderName\(spec\.providerId\)/u);
assert.match(creationSource, /reasoningEffort: spec\.reasoningEffort/u);
assert.match(creationSource, /workspaceId: spec\.workspaceId/u);
assert.match(creationSource, /workspacePath: spec\.workspacePath/u);
assert.match(creationSource, /kind: "managed"/u);
assert.match(creationSource, /toolingCategories: \{\}/u);
assert.match(creationSource, /tools: \[\]/u);
assert.match(creationSource, /type: "profile-creator"/u);
assert.match(
  creationSource,
  /outputSchema: profileStudioAgent\.getOutputSchema/u
);
assert.match(creationSource, /model: session\.model/u);
assert.match(creationSource, /includeProfileStudioWorkspace/u);

assert.match(facadeSource, /async createProfileCreatorSession\(/u);
assert.match(facadeSource, /buildProfileCreatorSession\(request\)/u);
assert.match(
  facadeSource,
  /workspaces: includeProfileStudioWorkspace\(workspaces\)/u
);
assert.match(turnOptionsSource, /buildProfileCreatorTurnOptions\(session\)/u);

console.log("session-creation tests: OK");
