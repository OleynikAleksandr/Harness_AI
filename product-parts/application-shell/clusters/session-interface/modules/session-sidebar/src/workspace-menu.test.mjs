import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const menuSource = readFileSync(
  new URL("./workspace-menu.tsx", import.meta.url),
  "utf8"
);
const sidebarSource = readFileSync(
  new URL("./session-sidebar-facade.tsx", import.meta.url),
  "utf8"
);
const hookSource = readFileSync(
  new URL(
    "../../session-window/src/session-window-workspaces.ts",
    import.meta.url
  ),
  "utf8"
);

// Right-click on a project opens the in-app context menu; the built-in
// workspace (identified by Core) gets none.
assert.match(
  menuSource,
  /onContextMenu=\{\(event\) => openProjectMenu\(event, item\)\}/u
);
assert.match(menuSource, /event\.preventDefault\(\);/u);
assert.match(
  menuSource,
  /if \(item\.id === builtInWorkspaceId\) \{\s*return;/u
);
// The first (and only) item removes the project from the app.
assert.match(
  menuSource,
  /"sidebar\.removeProject",\s*"Remove from Harness AI"/u
);
assert.match(menuSource, /await onRemoveWorkspace\(workspaceId\)/u);
assert.doesNotMatch(menuSource, /window\.(confirm|alert|prompt)/u);
// Escape and an outside pointer close the menu.
assert.match(menuSource, /closest\("\.workspace-context-menu"\)/u);
assert.match(menuSource, /event\.key === "Escape"/u);

// The sidebar delegates the project list to the menu component.
assert.match(sidebarSource, /<WorkspaceMenu\b/u);
assert.match(sidebarSource, /onRemoveWorkspace=\{onRemoveWorkspace\}/u);

// The hook only forwards the intent and mirrors the Core answer.
assert.match(
  hookSource,
  /await window\.harnessCore\?\.removeWorkspace\(workspaceId\)/u
);
assert.match(hookSource, /setWorkspaces\(result\.workspaces\);/u);
assert.match(
  hookSource,
  /if \(active && active\.id !== activeWorkspaceId\) \{\s*setActiveWorkspaceId\(active\.id\);\s*await onWorkspaceActivated\(active\);/u
);
assert.match(
  hookSource,
  /setBuiltInWorkspaceId\(snapshot\.builtInWorkspaceId \?\? ""\);/u
);
console.log("workspace-menu tests passed");
