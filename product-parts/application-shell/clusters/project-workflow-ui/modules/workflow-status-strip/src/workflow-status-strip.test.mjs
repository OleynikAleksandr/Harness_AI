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
const clusterCss = readFileSync(
  new URL("../../../src/project-workflow-ui.css", import.meta.url),
  "utf8"
);

// Values come from Core: the status through the bridge, kept current by
// Core events; the autopilot snapshot through the plan panel hook.
assert.match(
  stateSource,
  /window\.harnessCore\s*\?\.getWorkflowStatus\(\{ workspaceId \}\)/u
);
assert.match(stateSource, /event\.type === "workflow:status"/u);
assert.match(stateSource, /event\.workspaceId === workspaceId/u);
assert.match(stateSource, /event\.payload\.state === "idle"/u);
assert.doesNotMatch(stateSource, /Autopilot|autopilot/u);
assert.match(
  stripSource,
  /import \{ useWorkflowAutopilot \} from "\.\.\/\.\.\/project-plan-panel\/src\/project-plan-panel-facade\.js";/u
);
assert.match(stripSource, /useWorkflowAutopilot\(sessionId\)/u);

// Rendered only for an installed Kit; Core labels are localized.
assert.match(stripSource, /status\?\.ok && status\.result\.installed/u);
assert.match(stripSource, /kit\.currentTask \?\? kit\.nextTask/u);
assert.match(stripSource, /kit\.progress\.done/u);
assert.match(
  stripSource,
  /`workflow\.autopilot\.reason\.\$\{decision\.reason\}`/u
);
assert.match(stripSource, /decision\.reason !== "disabled"/u);
assert.match(stripSource, /"workflow\.strip\.continuing", "Continuing"/u);
// Core decides whether the session can use the autopilot.
assert.match(stripSource, /sessionId && autopilot\?\.available/u);
// The autopilot switch is gone: the pause button lives in the plan panel.
assert.doesNotMatch(
  stripSource + stateSource,
  /setWorkflowAutopilot|setWorkflowPause|aria-pressed|<button|workflow\.strip\.autopilot/u
);
assert.doesNotMatch(
  clusterCss,
  /workflow-status-autopilot|workflow-autopilot-(?:switch|error)/u
);
assert.doesNotMatch(stripSource, /window\.(?:alert|confirm|prompt)/u);
// The strip never decides workflow truth itself.
assert.doesNotMatch(
  stripSource + stateSource,
  /decide|nextTask\s*=|scripts\/workflow/u
);

console.log("workflow-status-strip tests: OK");
