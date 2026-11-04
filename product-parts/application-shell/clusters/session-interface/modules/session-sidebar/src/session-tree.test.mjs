import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const LOCALIZATION_IMPORT =
  /from "[^"]*browser-localization-provider-facade\.js"/u;
const PANEL_IMPORT = /from "[^"]*project-plan-panel-facade\.js"/u;
const CARD_IMPORT = /from "[^"]*execution-mode-card-facade\.js"/u;

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

assert.match(
  treeSource,
  /buildSessionTree\(sessions, new Set\(plan\?\.boundSessionIds/u
);
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
// The right-click target covers the whole session row: the stretched title
// button plus explicit handlers on the chevron and detach buttons —
// title-only handling left dead zones where the gesture silently failed
// (acceptance finding 2026-07-13).
const contextMenuHandlers =
  treeSource.match(/onContextMenu=\{openRowContextMenu\}/gu) ?? [];
assert.equal(
  contextMenuHandlers.length,
  3,
  "chevron, title and detach buttons all open the row context menu"
);
assert.match(treeSource, /const openRowContextMenu = /u);
// The menu renders position:fixed anchored to the row rect: absolutely
// positioned menus were clipped entirely by the scrollable session list
// when the list content was shorter than the menu (verified live in the
// packaged app, 2026-07-13).
assert.match(treeSource, /SessionContextMenuAnchor/u);
assert.match(treeSource, /getBoundingClientRect\(\)/u);
assert.match(sidebarSource, /setMenuAnchor/u);
assert.match(sidebarSource, /window\.innerWidth - menuAnchor\.right/u);
assert.match(
  sidebarSource,
  /addEventListener\("scroll", closeOnViewportChange, true\)/u,
  "a scroll closes the fixed-position menu"
);
assert.match(
  stylesSource,
  /\.session-context-menu \{[^}]*position: fixed/u,
  "menu escapes list clipping via fixed positioning"
);
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

// The plan under the owner card (spec 10.2): rendered with React's server
// renderer from a Core plan view; the renderer matches no sessions itself.
assert.doesNotMatch(treeSource, /workingDirectory|worktree/u);
assert.match(sidebarSource, /planView=\{planView\}/u);
// The mode card (Core model and owner) comes from the card module's hook.
assert.match(
  sidebarSource,
  /const modeChoice = useExecutionModeCard\(workspace\.id\);/u
);
assert.match(sidebarSource, /modeChoice=\{modeChoice\}/u);
{
  const require = createRequire(import.meta.url);
  const resolved = (name) => pathToFileURL(require.resolve(name)).href;
  const panelUrl = new URL(
    "../../../../project-workflow-ui/modules/project-plan-panel/src/",
    import.meta.url
  );
  const cardUrl = new URL(
    "../../../../project-workflow-ui/modules/execution-mode-card/src/",
    import.meta.url
  );
  const buildDir = await mkdtemp(path.join(tmpdir(), "session-tree-plan-"));
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
      .replace(/import "[^"]+\.css";\n/gu, "")
      .replace(LOCALIZATION_IMPORT, 'from "./t.js"')
      .replace(PANEL_IMPORT, 'from "./panel.js"')
      .replace(CARD_IMPORT, 'from "./card.js"');
  try {
    writeFileSync(
      path.join(buildDir, "t.js"),
      "export const useBrowserLocalization = () => ({ t: (_c, _k, text) => text });\n"
    );
    for (const [file, target, base] of [
      ["project-plan-panel-state.ts", "project-plan-panel-state.js", panelUrl],
      ["project-plan-panel-facade.tsx", "panel.js", panelUrl],
      ["execution-mode-card-state.ts", "execution-mode-card-state.js", cardUrl],
      ["execution-mode-card-facade.tsx", "card.js", cardUrl],
    ]) {
      writeFileSync(
        path.join(buildDir, target),
        toModule(readFileSync(new URL(file, base), "utf8"))
      );
    }
    writeFileSync(path.join(buildDir, "tree.js"), toModule(treeSource));
    const { SessionTree } = await import(
      pathToFileURL(path.join(buildDir, "tree.js")).href
    );
    const { createElement } = await import(resolved("react"));
    const { renderToStaticMarkup } = await import(resolved("react-dom/server"));
    const session = (id, fields = {}) => ({
      id,
      sessionKind: "primary",
      title: `Title ${id}`,
      ...fields,
    });
    const child = (id) =>
      session(id, {
        parentSessionId: "owner",
        sessionKind: "subagent",
        subagentStatus: "running",
      });
    const sessions = [
      session("owner"),
      child("exec-1"),
      child("helper"),
      session("other"),
    ];
    const planView = (mode) => ({
      boundSessionIds: ["exec-1"],
      mode,
      objective: "Ship the plan",
      ownerSessionId: "owner",
      progress: { done: 0, total: 1 },
      rows: [
        {
          current: true,
          executorSessionId: "exec-1",
          kind: "work",
          label: mode === "orchestrated" ? "parallel" : null,
          status: "IN_PROGRESS",
          taskId: "E1",
          title: "Task one",
        },
      ],
      scopeId: "ship",
      status: "ACTIVE",
    });
    const render = (plan, activeSessionId = "helper", card = null) =>
      renderToStaticMarkup(
        createElement(SessionTree, {
          activeSessionId,
          contextMenuSessionId: null,
          modeChoice: card
            ? { card, choose: () => Promise.resolve(null) }
            : null,
          onContextMenu: () => undefined,
          onDetachSession: () => undefined,
          onSelectSession: () => undefined,
          planView: plan,
          renderContextMenu: () => null,
          sessions,
        })
      );
    const ownerCard = (markup) =>
      markup.slice(
        markup.indexOf("Title owner"),
        markup.indexOf("Title other")
      );

    // Orchestrated: the owner card says Orchestrator and the plan follows
    // it; the bound executor gets no child card and is not counted, the
    // other subagent stays under the owner.
    const orchestrated = render(planView("orchestrated"));
    assert.match(
      ownerCard(orchestrated),
      /<small>Orchestrator · 1 subagent · 1 running<\/small>/u
    );
    assert.match(ownerCard(orchestrated), /class="project-plan-panel"/u);
    // Children start collapsed (no effects in the server renderer); the
    // counts show the executor is not a child card while the helper is.
    assert.match(orchestrated, /aria-label="Expand subagents"/u);
    assert.doesNotMatch(orchestrated, /Title exec-1/u);
    assert.equal(orchestrated.match(/project-plan-panel"/gu)?.length, 1);
    // Sequential: Agent.
    assert.match(
      render(planView("sequential")),
      /<small>Agent · 1 subagent · 1 running<\/small>/u
    );
    // No plan, or an owner outside the list: no panel, no role and every
    // child card as before.
    const plain = render(null);
    assert.doesNotMatch(plain, /project-plan-panel|Orchestrator|Agent/u);
    assert.match(plain, /<small>2 subagents · 2 running<\/small>/u);
    const foreign = render({
      ...planView("orchestrated"),
      ownerSessionId: "gone",
    });
    assert.doesNotMatch(foreign, /project-plan-panel/u);
    assert.match(foreign, /2 subagents/u);

    // The mode card renders in the plan slot under its Core owner card.
    const modeCard = (fields = {}) => ({
      chosen: null,
      error: null,
      generation: 2,
      options: [
        { id: "orchestrated", recommended: true },
        { id: "sequential", recommended: false },
        { id: "refine", recommended: false },
      ],
      reason: "Two independent modules can run in parallel.",
      scopeId: "ship",
      sessionId: "owner",
      state: "offered",
      title: "Ship the plan",
      workspaceId: "ws",
      ...fields,
    });
    // Offered: question, rows in Core order with the recommended mark, the
    // reason under it, a filled button and the hint; no plan panel yet.
    const offered = ownerCard(
      render(planView("sequential"), "helper", modeCard())
    );
    assert.match(offered, /class="execution-mode-card"/u);
    assert.match(offered, /How should the plan be executed\?/u);
    assert.match(offered, /<small title="ship">Ship the plan<\/small>/u);
    assert.doesNotMatch(offered, /project-plan-panel/u);
    const rows = offered.match(/<li class="execution-mode-card-option">/gu);
    assert.equal(rows?.length, 3);
    assert.ok(
      offered.indexOf("Orchestrate executors") <
        offered.indexOf("Execute sequentially") &&
        offered.indexOf("Execute sequentially") <
          offered.indexOf("Refine the specification")
    );
    assert.match(
      offered,
      /Orchestrate executors<em> \(recommended\)<\/em>[\s\S]*?<small class="execution-mode-card-reason">Two independent modules can run in parallel\.<\/small><\/div><button class="project-workflow-primary" type="button">Choose<\/button>/u
    );
    assert.equal(offered.match(/\(recommended\)/gu)?.length, 1);
    assert.equal(offered.match(/project-workflow-secondary/gu)?.length, 2);
    assert.match(offered, /or write your answer in the chat/u);
    // Saving: neutral border, disabled buttons, still no plan panel.
    const saving = ownerCard(
      render(planView("sequential"), "helper", modeCard({ state: "saving" }))
    );
    assert.match(saving, /class="execution-mode-card is-saving"/u);
    assert.equal(saving.match(/disabled=""/gu)?.length, 3);
    assert.match(saving, /Saving the choice\.\.\./u);
    assert.doesNotMatch(saving, /project-plan-panel/u);
    // A Core error stays in the card.
    assert.match(
      ownerCard(
        render(null, "helper", modeCard({ error: "PROPOSAL_CHANGED: refused" }))
      ),
      /role="alert">PROPOSAL_CHANGED: refused<\/small>/u
    );
    // Chosen: the compact line, then the plan panel in the same slot.
    const chosen = ownerCard(
      render(
        planView("orchestrated"),
        "helper",
        modeCard({ chosen: "orchestrated", state: "chosen" })
      )
    );
    assert.match(
      chosen,
      /execution-mode-card--chosen[\s\S]*?Chosen: <strong>Orchestrate executors<\/strong> · sent to the agent/u
    );
    assert.ok(
      chosen.indexOf("execution-mode-card--chosen") <
        chosen.indexOf('class="project-plan-panel"')
    );
    assert.doesNotMatch(chosen, /Choose<\/button>/u);
    // Dismissed: nothing, the plan as before.
    const dismissed = ownerCard(
      render(planView("sequential"), "helper", modeCard({ state: "dismissed" }))
    );
    assert.doesNotMatch(dismissed, /execution-mode-card/u);
    assert.match(dismissed, /class="project-plan-panel"/u);
    // Another owner: the card goes under that session's card only; an
    // unlisted owner shows no card anywhere.
    const elsewhere = render(
      planView("sequential"),
      "helper",
      modeCard({ sessionId: "other" })
    );
    assert.doesNotMatch(ownerCard(elsewhere), /execution-mode-card/u);
    assert.match(ownerCard(elsewhere), /class="project-plan-panel"/u);
    assert.match(
      elsewhere.slice(elsewhere.indexOf("Title other")),
      /class="execution-mode-card"/u
    );
    assert.doesNotMatch(
      render(null, "helper", modeCard({ sessionId: "gone" })),
      /execution-mode-card/u
    );
  } finally {
    await rm(buildDir, { force: true, recursive: true });
  }
}
