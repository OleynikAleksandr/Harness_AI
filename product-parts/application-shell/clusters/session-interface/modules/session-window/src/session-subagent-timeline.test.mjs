import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const timelineSource = readFileSync(
  new URL("./session-subagent-timeline.tsx", import.meta.url),
  "utf8"
);
const dialogSource = readFileSync(
  new URL("./session-dialog-panel.tsx", import.meta.url),
  "utf8"
);
const coreEventsSource = readFileSync(
  new URL("./session-window-core-events.ts", import.meta.url),
  "utf8"
);
const stylesSource = readFileSync(
  new URL("./session-window.css", import.meta.url),
  "utf8"
);

assert.match(timelineSource, /buildSessionTimeline/u);
assert.match(timelineSource, /timestamp: call\.createdAt/u);
assert.match(
  timelineSource,
  /left\.timestamp\.localeCompare\(right\.timestamp\)/u
);

// Consecutive subagent launches collapse into one divider item whose count
// grows in place (1, 2, 3, ...) as new launches join the group
// (docs/architecture/ClaudeSubagentSessions.md, section 5).
assert.match(timelineSource, /kind: "subagent-launch"/u);
assert.match(timelineSource, /previous\.calls\.push\(entry\.call\)/u);
assert.match(timelineSource, /Math\.max\(call\.childSessionIds\.length, 1\)/u);
assert.match(timelineSource, /session\.subagents\.launched/u);
assert.match(timelineSource, /session-subagent-divider__label/u);
assert.match(timelineSource, /session-subagent-divider__count/u);

// The divider is label + count only: no card markup, no task list, no
// open/detach controls, no per-child statuses. Everything else lives in the
// sidebar tree.
assert.doesNotMatch(timelineSource, /session-subagent-call/u);
assert.doesNotMatch(timelineSource, /launchedForTasks/u);
assert.doesNotMatch(timelineSource, /delegatedTask/u);
assert.doesNotMatch(timelineSource, /onOpenSubagent/u);
assert.doesNotMatch(timelineSource, /onDetachSubagent/u);
assert.doesNotMatch(timelineSource, /<button/u);
assert.doesNotMatch(timelineSource, /subagentStatus/u);

assert.match(
  dialogSource,
  /buildSessionTimeline\(displayMessages, subagentCalls\)/u
);
assert.match(dialogSource, /<SubagentLaunchDivider calls=\{item\.calls\}/u);
assert.match(dialogSource, /item\.kind === "message"/u);
assert.doesNotMatch(dialogSource, /SubagentCallTimelineItem/u);
assert.doesNotMatch(dialogSource, /onOpenSubagent/u);
assert.doesNotMatch(dialogSource, /onDetachSubagent/u);

assert.match(coreEventsSource, /event\.type === "session:subagent-call"/u);
assert.match(coreEventsSource, /upsertSubagentCallToState/u);
assert.match(coreEventsSource, /candidate\.id === call\.id/u);
assert.equal(timelineSource.split("\n").length <= 500, true);
assert.equal(dialogSource.split("\n").length <= 500, true);
assert.match(stylesSource, /\.session-sidebar \{[\s\S]*resize: horizontal/u);
assert.match(stylesSource, /\.session-tree-children/u);
assert.match(stylesSource, /\.session-subagent-divider \{/u);
assert.match(
  stylesSource,
  /\.session-subagent-divider::before,\n\.session-subagent-divider::after \{/u
);
assert.match(stylesSource, /\.session-subagent-divider__count/u);
assert.doesNotMatch(stylesSource, /\.session-subagent-call/u);
assert.match(stylesSource, /\.session-reference-shell--subagent/u);
assert.match(stylesSource, /\.session-rename-dialog/u);
assert.match(stylesSource, /\.session-tree-title:focus-visible/u);

console.log("session-subagent-timeline tests passed");
