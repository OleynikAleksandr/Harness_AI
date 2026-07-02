import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const listSource = readFileSync(
  new URL("./profile-list.tsx", import.meta.url),
  "utf8"
);
const stepSource = readFileSync(
  new URL(
    "../../../../session-interface/modules/session-window/src/session-profile-step.tsx",
    import.meta.url
  ),
  "utf8"
);

// Both profile surfaces reload the catalog on the Core profile change event.
for (const source of [listSource, stepSource]) {
  assert.match(source, /"session-profiles:updated"/u);
  assert.match(source, /window\.harnessCore\?\.onEvent/u);
  assert.match(source, /isSessionProfilesUpdatedEvent\(event\)/u);
  assert.match(source, /loadProfiles\(/u);
}

// The step keeps a still-valid current selection on reloads after file edits.
assert.match(stepSource, /loadProfiles\(true\)/u);
assert.match(stepSource, /preserveSelection/u);

console.log("profile-list tests: OK");
