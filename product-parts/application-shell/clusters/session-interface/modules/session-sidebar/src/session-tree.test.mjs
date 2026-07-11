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

assert.match(treeSource, /buildSessionTree\(sessions\)/u);
assert.match(treeSource, /session\.parentSessionId/u);
assert.match(treeSource, /session\.sessionKind !== "subagent"/u);
assert.match(treeSource, /collectDescendants\(/u);
assert.match(treeSource, /<SessionTreeNode/u);
assert.match(treeSource, /session-tree-children/u);
assert.match(treeSource, /expandedSessionIds/u);
assert.match(treeSource, /tree\.parentBySessionId\.get\(activeSessionId\)/u);
assert.match(treeSource, /session-tree-status--\$\{session\.subagentStatus/u);
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
assert.equal(treeSource.split("\n").length <= 500, true);
assert.equal(sidebarSource.split("\n").length <= 500, true);
