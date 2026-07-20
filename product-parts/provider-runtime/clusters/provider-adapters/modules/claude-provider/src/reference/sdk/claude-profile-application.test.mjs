import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./claude-profile-application.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { applyClaudeSessionProfile } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

const studioOptions = {
  settingSources: ["project"],
  systemPrompt: "legacy",
  tools: ["legacy"],
};
const studioDetails = applyClaudeSessionProfile(studioOptions, {
  kind: "managed",
  payload: {
    contentHash: "studio-hash",
    profileId: "planning-documents",
    profileName: "Planning Documents",
    prompt: "Reduced Native foundation.\n\nCustom additions.",
    toolingCategories: { "file-read": false, web: false },
    tools: [{ name: "Read" }, { function: { name: "Glob" } }],
  },
});

assert.equal(
  studioOptions.systemPrompt,
  "Reduced Native foundation.\n\nCustom additions."
);
assert.deepEqual(studioOptions.tools, ["Read", "Glob"]);
assert.deepEqual(studioOptions.settingSources, []);
assert.equal(studioDetails.toolMode, "explicit-native-subset");
assert.equal(studioDetails.systemPrompt, "full-replacement");
assert.deepEqual(studioDetails.toolWhitelist, ["Read", "Glob"]);

const legacyOptions = {};
const legacyDetails = applyClaudeSessionProfile(legacyOptions, {
  kind: "managed",
  payload: {
    contentHash: "legacy-hash",
    profileId: "legacy-profile",
    profileName: "Legacy Profile",
    prompt: "Legacy prompt",
    toolingCategories: { "file-read": true, web: true },
  },
});
assert.deepEqual(legacyOptions.tools, [
  "Read",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
]);
assert.equal(legacyDetails.toolMode, "category-map");

assert.throws(
  () =>
    applyClaudeSessionProfile(
      {},
      {
        kind: "managed",
        payload: {
          contentHash: "invalid-hash",
          profileId: "invalid-profile",
          profileName: "Invalid Profile",
          prompt: "Prompt",
          toolingCategories: {},
          tools: [{ description: "missing name" }],
        },
      }
    ),
  /without a name/u
);

console.log("claude profile application tests: OK");
