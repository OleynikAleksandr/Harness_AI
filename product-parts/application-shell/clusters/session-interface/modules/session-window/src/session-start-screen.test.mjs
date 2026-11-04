import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const screenSource = readFileSync(
  new URL("./session-start-screen.tsx", import.meta.url),
  "utf8"
);
const facadeSource = readFileSync(
  new URL("./session-window-facade.tsx", import.meta.url),
  "utf8"
);
const hookSource = readFileSync(
  new URL("./session-window-workspaces.ts", import.meta.url),
  "utf8"
);
const stylesSource = readFileSync(
  new URL("./session-window.css", import.meta.url),
  "utf8"
);
const LOCALIZATION_IMPORT =
  /from "[^"]*browser-localization-provider-facade\.js"/u;
const SETUP_DIALOG_IMPORT = /from "[^"]*project-setup-dialog-facade\.js"/u;

// The window takes no project from the snapshot: the Core list decides.
assert.doesNotMatch(facadeSource, /initialSnapshot\.workspace/u);
assert.doesNotMatch(hookSource, /initialWorkspace|builtInWorkspaceId/u);
assert.match(
  hookSource,
  /snapshot\.workspaces\.find\(\(item\) => item\.id === workspaceId\) \?\? null;/u
);
// The ordinary content goes through the gate with the Core list state.
assert.match(facadeSource, /<SessionWorkspaceGate\b/u);
assert.match(facadeSource, /loaded=\{isWorkspaceListLoaded\}/u);
assert.match(facadeSource, /workspace=\{activeWorkspace\}/u);
// A NO_WORKSPACE refusal of create-session mirrors the Core list again.
assert.match(facadeSource, /mirrorWorkspaceFailure\(result\.code\);/u);
assert.match(
  hookSource,
  /if \(code !== "NO_WORKSPACE"\) \{\s*return;\s*\}\s*window\.harnessCore\s*\?\.listWorkspaces\(\)\s*\.then\(applyWorkspaceList\)/u
);
// The start screen buttons open the project setup dialog in its modes.
assert.match(screenSource, /onClick=\{\(\) => setSetupMode\("open"\)\}/u);
assert.match(screenSource, /onClick=\{\(\) => setSetupMode\("new"\)\}/u);
assert.match(screenSource, /mode=\{setupMode\}/u);
assert.doesNotMatch(screenSource, /window\.(confirm|alert|prompt)/u);
assert.match(
  stylesSource,
  /\.session-start-screen \{[^}]*grid-column: 1 \/ -1/u
);

{
  const require = createRequire(import.meta.url);
  const resolved = (name) => pathToFileURL(require.resolve(name)).href;
  const buildDir = await mkdtemp(path.join(tmpdir(), "session-start-screen-"));
  const toModule = (source) =>
    ts
      .transpileModule(source, {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      })
      .outputText.replace(
        /from "(react|react\/jsx-runtime|lucide-react)"/gu,
        (_match, name) => `from "${resolved(name)}"`
      )
      .replace(LOCALIZATION_IMPORT, 'from "./t.js"')
      .replace(SETUP_DIALOG_IMPORT, 'from "./setup.js"');
  try {
    writeFileSync(
      path.join(buildDir, "t.js"),
      "export const useBrowserLocalization = () => ({ t: (_c, key, text) => key + ':' + text });\n"
    );
    writeFileSync(
      path.join(buildDir, "setup.js"),
      "export const ProjectSetupDialogFacade = () => null;\n"
    );
    writeFileSync(path.join(buildDir, "screen.js"), toModule(screenSource));
    const { SessionWorkspaceGate } = await import(
      pathToFileURL(path.join(buildDir, "screen.js")).href
    );
    const { createElement } = await import(resolved("react"));
    const { renderToStaticMarkup } = await import(resolved("react-dom/server"));
    const render = (loaded, workspace) =>
      renderToStaticMarkup(
        createElement(SessionWorkspaceGate, {
          children: (active) => createElement("p", null, `shell ${active.id}`),
          loaded,
          onPrepared: () => undefined,
          workspace,
        })
      );

    // Before the first Core list nothing is shown (no start screen flash).
    assert.equal(render(false, null), "");

    // Without an active project (an empty list): the start screen with
    // Open Project and New Project through the existing localization keys.
    const start = render(true, null);
    assert.match(start, /class="session-start-screen"/u);
    assert.match(start, /sidebar\.openProject:Open Project/u);
    assert.match(start, /sidebar\.newProject:New Project/u);
    assert.match(start, /project\.setup\.open\.description:/u);
    assert.match(start, /project\.setup\.new\.description:/u);
    assert.equal(start.match(/<button/gu)?.length, 2);
    assert.doesNotMatch(start, /shell/u);

    // With an active project the ordinary shell renders for it.
    const project = { id: "workspace-1", name: "One", path: "/tmp/one" };
    assert.equal(render(true, project), "<p>shell workspace-1</p>");
    assert.equal(render(false, project), "<p>shell workspace-1</p>");
  } finally {
    await rm(buildDir, { force: true, recursive: true });
  }
}
console.log("session-start-screen tests passed");
