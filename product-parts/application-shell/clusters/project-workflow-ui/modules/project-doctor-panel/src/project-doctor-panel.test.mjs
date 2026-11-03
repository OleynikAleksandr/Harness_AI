import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./project-doctor-panel-facade.tsx", import.meta.url),
  "utf8"
);

// Core runs the doctor and the fix; the panel renders the report.
assert.match(
  source,
  /window\.harnessCore\?\.runProjectDoctor\(\{\s*fix,\s*workspaceId: workspace\.id,?\s*\}\)/u
);
assert.match(source, /run\(false\)/u);
assert.match(source, /run\(true\)/u);
assert.match(source, /check\.fixable && check\.status !== "ok"/u);
assert.match(source, /`project\.doctor\.check\.\$\{check\.id\}`/u);
assert.match(source, /`project\.doctor\.status\.\$\{check\.status\}`/u);
assert.match(source, /check\.nextAction/u);
assert.match(source, /role="dialog"/u);
assert.match(source, /aria-modal="true"/u);
assert.match(source, /role="alert"/u);
assert.doesNotMatch(source, /window\.(?:alert|confirm|prompt)/u);
assert.doesNotMatch(source, /node:fs|scripts\/workflow/u);

console.log("project-doctor-panel tests: OK");
