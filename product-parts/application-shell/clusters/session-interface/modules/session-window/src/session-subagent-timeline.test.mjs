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
assert.match(timelineSource, /call\.childSessionIds/u);
assert.match(timelineSource, /session\?\.delegatedTask/u);

// The dialog card is a text-only info panel: launch count + delegated task
// list. Open/detach controls and live statuses live in the sidebar tree only
// (docs/architecture/ClaudeSubagentSessions.md, section 5).
assert.match(timelineSource, /session-subagent-call__summary/u);
assert.match(timelineSource, /session-subagent-call__tasks/u);
assert.doesNotMatch(timelineSource, /onOpenSubagent/u);
assert.doesNotMatch(timelineSource, /onDetachSubagent/u);
assert.doesNotMatch(timelineSource, /<button/u);
assert.doesNotMatch(timelineSource, /ExternalLink/u);
assert.doesNotMatch(timelineSource, /subagentStatus/u);
assert.doesNotMatch(timelineSource, /message\.text\.includes/u);
assert.doesNotMatch(timelineSource, /rollout/u);

assert.match(
  dialogSource,
  /buildSessionTimeline\(displayMessages, subagentCalls\)/u
);
assert.match(dialogSource, /<SubagentCallTimelineItem/u);
assert.match(dialogSource, /item\.kind === "message"/u);
assert.doesNotMatch(dialogSource, /onOpenSubagent/u);
assert.doesNotMatch(dialogSource, /onDetachSubagent/u);
assert.match(coreEventsSource, /event\.type === "session:subagent-call"/u);
assert.match(coreEventsSource, /upsertSubagentCallToState/u);
assert.match(coreEventsSource, /candidate\.id === call\.id/u);
assert.equal(timelineSource.split("\n").length <= 500, true);
assert.equal(dialogSource.split("\n").length <= 500, true);
assert.match(stylesSource, /\.session-sidebar \{[\s\S]*resize: horizontal/u);
assert.match(stylesSource, /\.session-tree-children/u);
assert.match(stylesSource, /\.session-subagent-call__summary/u);
assert.match(stylesSource, /\.session-subagent-call__tasks/u);
assert.doesNotMatch(stylesSource, /\.session-subagent-call__detach/u);
assert.doesNotMatch(stylesSource, /\.session-subagent-call__open/u);
assert.match(stylesSource, /\.session-reference-shell--subagent/u);
assert.match(stylesSource, /\.session-rename-dialog/u);
assert.match(stylesSource, /\.session-tree-title:focus-visible/u);

console.log("session-subagent-timeline tests passed");
