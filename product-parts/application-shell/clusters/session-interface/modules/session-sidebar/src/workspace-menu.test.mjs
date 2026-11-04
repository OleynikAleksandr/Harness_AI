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

// Right-click on any project opens the in-app context menu: there is no
// built-in project, so no project is exempt from removal.
assert.match(
  menuSource,
  /onContextMenu=\{\(event\) => openProjectMenu\(event, item\)\}/u
);
const openProjectMenuBody = menuSource.slice(
  menuSource.indexOf("function openProjectMenu("),
  menuSource.indexOf("async function removeProject(")
);
assert.match(
  openProjectMenuBody,
  /event\.preventDefault\(\);\s*const rect = event\.currentTarget\.getBoundingClientRect\(\);/u
);
assert.match(openProjectMenuBody, /workspaceId: item\.id,/u);
assert.doesNotMatch(openProjectMenuBody, /return;/u);
assert.doesNotMatch(menuSource, /builtIn/iu);
assert.doesNotMatch(sidebarSource, /builtIn/iu);
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
// Removing the active project shows the project Core activated next, or no
// project at all (the start screen) after the last one.
assert.match(
  hookSource,
  /const nextActiveId = active\?\.id \?\? null;\s*if \(nextActiveId !== activeWorkspaceId\) \{\s*setActiveWorkspaceId\(nextActiveId\);\s*await onWorkspaceActivated\(active\);/u
);
assert.doesNotMatch(hookSource, /builtIn/iu);
console.log("workspace-menu tests passed");
