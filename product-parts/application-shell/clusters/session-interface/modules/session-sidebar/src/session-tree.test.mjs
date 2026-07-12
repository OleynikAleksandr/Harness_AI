import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const treeSource = readFileSync(
  new URL("./session-tree.tsx", import.meta.url),
  "utf8"
);
const sidebarSource = readFileSync(
  new URL("./session-sidebar-facade.tsx", import.meta.url),
  "utf8"
);
const stylesSource = readFileSync(
  new URL("../../session-window/src/session-window.css", import.meta.url),
  "utf8"
);

assert.match(treeSource, /buildSessionTree\(sessions\)/u);
assert.match(treeSource, /session\.parentSessionId/u);
assert.match(treeSource, /session\.sessionKind !== "subagent"/u);
assert.match(treeSource, /collectDescendants\(/u);
assert.match(treeSource, /<SessionTreeNode/u);
assert.match(treeSource, /session-tree-children/u);
assert.match(treeSource, /expandedSessionIds/u);
assert.match(treeSource, /tree\.parentBySessionId\.get\(activeSessionId\)/u);
assert.match(treeSource, /session-tree-status--\$\{session\.subagentStatus/u);
assert.match(treeSource, /session\.delegatedTask/u);
assert.match(
  treeSource,
  /session\.delegatedTask \? null : session\.agentRole/u
);
assert.match(treeSource, /onDetachSession\(session\.id\)/u);
assert.match(treeSource, /onSelectSession\(session\.id\)/u);
assert.doesNotMatch(treeSource, /message\.text/u);
assert.doesNotMatch(treeSource, /rollout/u);

assert.match(sidebarSource, /<SessionTree/u);
assert.match(sidebarSource, /session-rename-dialog/u);
assert.match(sidebarSource, /maxLength=\{100\}/u);
assert.match(sidebarSource, /onRenameSession/u);
assert.match(sidebarSource, /onRegenerateSessionTitle/u);
assert.doesNotMatch(sidebarSource, /window\.prompt/u);
assert.doesNotMatch(sidebarSource, /window\.confirm/u);
// In-flight children show a hollow neutral ring; settled outcomes keep a
// filled dot with clear colors (green completed, orange interrupted).
assert.match(
  stylesSource,
  /\.session-tree-status--pending,\s*\.session-tree-status--running \{[^}]*fill: transparent/u
);
assert.match(
  stylesSource,
  /\.session-tree-status--completed,[\s\S]{0,200}?color: #52c974/u
);
assert.match(
  stylesSource,
  /\.session-tree-status--interrupted,[\s\S]{0,200}?color: #f0883e/u
);

assert.equal(treeSource.split("\n").length <= 500, true);
assert.equal(sidebarSource.split("\n").length <= 500, true);
