import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stripSource = readFileSync(
  new URL("./workflow-status-strip-facade.tsx", import.meta.url),
  "utf8"
);
const stateSource = readFileSync(
  new URL("./workflow-status-state.ts", import.meta.url),
  "utf8"
);

// Values come from Core: status and autopilot through the bridge, kept
// current by Core events.
assert.match(
  stateSource,
  /window\.harnessCore\s*\?\.getWorkflowStatus\(\{ workspaceId \}\)/u
);
assert.match(
  stateSource,
  /window\.harnessCore\s*\?\.getWorkflowAutopilot\(\{ sessionId \}\)/u
);
assert.match(stateSource, /window\.harnessCore\?\.setWorkflowAutopilot\(\{/u);
assert.match(stateSource, /event\.type === "workflow:status"/u);
assert.match(stateSource, /event\.workspaceId === workspaceId/u);
assert.match(
  stateSource,
  /event\.type === "workflow:autopilot" &&\s*event\.sessionId === sessionId/u
);
assert.match(stateSource, /event\.payload\.state === "idle"/u);

// Rendered only for an installed Kit; Core labels are localized.
assert.match(stripSource, /status\?\.ok && status\.result\.installed/u);
assert.match(stripSource, /kit\.currentTask \?\? kit\.nextTask/u);
assert.match(stripSource, /kit\.progress\.done/u);
assert.match(
  stripSource,
  /`workflow\.autopilot\.reason\.\$\{stopped\.reason\}`/u
);
assert.match(stripSource, /aria-pressed=\{enabled\}/u);
assert.match(stripSource, /onToggle\(!enabled\)/u);
assert.doesNotMatch(stripSource, /window\.(?:alert|confirm|prompt)/u);
// The strip never decides workflow truth itself.
assert.doesNotMatch(
  stripSource + stateSource,
  /decide|nextTask\s*=|scripts\/workflow/u
);

console.log("workflow-status-strip tests: OK");
