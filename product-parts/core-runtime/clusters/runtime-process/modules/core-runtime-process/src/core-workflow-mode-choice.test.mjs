import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const compiled = ts.transpileModule(
  readFileSync(
    new URL("./core-workflow-mode-choice.ts", import.meta.url),
    "utf8"
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const apiSource = readFileSync(
  new URL("./core-runtime-api.ts", import.meta.url),
  "utf8"
);
// A typed user message reaches the mode card before the session runtime;
// the choice message goes straight to the user-message route.
assert.ok(
  /this\.projectWorkflow\.userMessage\(\s*readString\(readRecord\(payload\)\?\.sessionId\)\s*\);\s*return sessionRequestHandlerFacade\.sendMessage/u.test(
    apiSource
  )
);
assert.ok(
  /sessionRequestHandlerFacade\.sendMessage\(\{ sessionId, text \}\)/u.test(
    apiSource
  )
);
const buildDir = await mkdtemp(path.join(tmpdir(), "workflow-mode-choice-"));

const settle = () => new Promise((resolve) => setImmediate(resolve));

function view(overrides = {}) {
  return {
    createdAt: "2026-11-04T10:00:00Z",
    generation: 1,
    hasParallelWork: true,
    host: "harness",
    objective: "Build two modules",
    options: ["orchestrated", "sequential", "refine"],
    reason: "Two independent modules with separate files",
    recommended: "orchestrated",
    refining: false,
    scopeId: "two-modules",
    ...overrides,
  };
}

try {
  writeFileSync(path.join(buildDir, "mode-choice.js"), compiled, "utf8");
  const { CoreWorkflowModeChoice, WORKFLOW_MODE_CHOICE_EVENT_TYPE } =
    await import(pathToFileURL(path.join(buildDir, "mode-choice.js")).href);
  assert.equal(WORKFLOW_MODE_CHOICE_EVENT_TYPE, "workflow:mode-choice");

  const sessions = new Map([
    [
      "claude-1",
      {
        id: "claude-1",
        providerId: "claude",
        workspaceId: "w1",
        workspacePath: "/work/one",
      },
    ],
    [
      "claude-2",
      {
        id: "claude-2",
        providerId: "claude",
        workspaceId: "w1",
        workspacePath: "/work/one",
      },
    ],
    [
      "codex-1",
      {
        id: "codex-1",
        providerId: "codex",
        workspaceId: "w2",
        workspacePath: "/work/two",
      },
    ],
    [
      "child-1",
      {
        id: "child-1",
        providerId: "claude",
        sessionKind: "subagent",
        workspaceId: "w1",
        workspacePath: "/work/one",
      },
    ],
    [
      "plain-1",
      {
        id: "plain-1",
        providerId: "claude",
        workspaceId: "w3",
        workspacePath: "/work/plain",
      },
    ],
  ]);
  const proposals = new Map([
    ["/work/one", view()],
    ["/work/two", view({ workspace: "two" })],
  ]);
  const calls = [];
  let refusal = null;
  const host = {
    bundle: (root) =>
      root === "/work/plain"
        ? { file: "app.mjs", source: "app" }
        : { file: "p.mjs", source: "project" },
    chooseScope: (root, choice) => {
      calls.push(["choose", root, choice]);
      if (refusal) {
        return Promise.resolve(refusal);
      }
      proposals.delete(root);
      return Promise.resolve({
        command: "scope:choose",
        ok: true,
        result: { option: choice.option, scope: { scopeId: "two-modules" } },
      });
    },
    proposal: (root) => {
      calls.push(["proposal", root]);
      return Promise.resolve({
        command: "scope:proposal",
        ok: true,
        result: proposals.get(root) ?? null,
      });
    },
  };
  const sent = [];
  const listeners = [];
  const events = [];
  const choice = new CoreWorkflowModeChoice({
    host,
    publish: (event) => events.push(event),
    sessions: {
      get: (sessionId) => sessions.get(sessionId),
      send: (sessionId, text) => {
        sent.push([sessionId, text]);
        return { ok: true };
      },
      subscribe: (listener) => {
        listeners.push(listener);
        return () => undefined;
      },
    },
  });
  const turn = async (sessionId, state = "idle") => {
    for (const listener of listeners) {
      listener({
        payload: { sessionId, state },
        timestamp: "now",
        type: "session:turn-state",
      });
    }
    await settle();
  };
  const card = (workspaceId) => choice.get(workspaceId).card;

  assert.equal(choice.get("").code, "INVALID_REQUEST");
  assert.equal(card("w1"), null);

  // Only a primary session's idle turn end of a Kit project reads the proposal.
  await turn("claude-1", "running");
  await turn("child-1");
  await turn("plain-1");
  await turn("unknown");
  assert.deepEqual(calls, []);
  assert.equal(events.length, 0);

  // A Claude owner gets orchestrated: the recommendation first, with the reason.
  await turn("claude-1");
  assert.deepEqual(calls, [["proposal", "/work/one"]]);
  assert.deepEqual(card("w1"), {
    chosen: null,
    error: null,
    generation: 1,
    options: [
      { id: "orchestrated", recommended: true },
      { id: "sequential", recommended: false },
      { id: "refine", recommended: false },
    ],
    reason: "Two independent modules with separate files",
    scopeId: "two-modules",
    sessionId: "claude-1",
    state: "offered",
    title: "Build two modules",
    workspaceId: "w1",
  });
  assert.deepEqual(events.at(-1), {
    card: card("w1"),
    sessionId: "claude-1",
    type: "workflow:mode-choice",
    workspaceId: "w1",
  });

  // Another session of the workspace ends a turn: the owner stays.
  const published = events.length;
  await turn("claude-2");
  assert.equal(card("w1").sessionId, "claude-1");
  assert.equal(events.length, published);

  // A non-Claude owner never sees orchestrated; its recommendation and
  // reason disappear with it.
  await turn("codex-1");
  assert.deepEqual(card("w2").options, [
    { id: "sequential", recommended: false },
    { id: "refine", recommended: false },
  ]);
  assert.equal(card("w2").reason, null);
  const notOffered = await choice.choose({
    generation: 1,
    option: "orchestrated",
    sessionId: "codex-1",
    workspaceId: "w2",
  });
  assert.equal(notOffered.code, "INVALID_REQUEST");

  // A proposal outside a Harness project or in refinement shows no card.
  proposals.set("/work/two", view({ host: null }));
  await turn("codex-1");
  assert.equal(card("w2"), null);
  assert.deepEqual(events.at(-1), {
    card: null,
    sessionId: "codex-1",
    type: "workflow:mode-choice",
    workspaceId: "w2",
  });
  proposals.set("/work/two", view({ refining: true, scopeId: null }));
  await turn("codex-1");
  assert.equal(card("w2"), null);

  // Only the owner session can answer, with an offered option.
  assert.equal(
    (
      await choice.choose({
        generation: 1,
        option: "sequential",
        sessionId: "claude-2",
        workspaceId: "w1",
      })
    ).code,
    "MODE_CHOICE_UNAVAILABLE"
  );
  assert.equal(
    (
      await choice.choose({
        generation: 0,
        option: "sequential",
        sessionId: "claude-1",
        workspaceId: "w1",
      })
    ).code,
    "INVALID_REQUEST"
  );

  // A Kit refusal returns the error and keeps the card offered.
  refusal = {
    code: "PROPOSAL_CHANGED",
    message: "The choice does not answer the current scope proposal.",
    nextAction: "Read the current proposal and let the user choose again.",
    ok: false,
  };
  events.length = 0;
  const refused = await choice.choose({
    generation: 1,
    option: "sequential",
    sessionId: "claude-1",
    workspaceId: "w1",
  });
  assert.equal(refused.code, "PROPOSAL_CHANGED");
  assert.deepEqual(
    events.map((event) => event.card.state),
    ["saving", "offered"]
  );
  assert.equal(card("w1").state, "offered");
  assert.equal(
    card("w1").error,
    "The choice does not answer the current scope proposal."
  );
  assert.deepEqual(sent, []);

  // The choice: scope:choose with the owner session, then the user message.
  refusal = null;
  calls.length = 0;
  events.length = 0;
  const chosen = await choice.choose({
    generation: 1,
    option: "orchestrated",
    sessionId: "claude-1",
    workspaceId: "w1",
  });
  assert.equal(chosen.ok, true);
  assert.deepEqual(calls, [
    [
      "choose",
      "/work/one",
      {
        generation: 1,
        note: "the user chose in the Harness mode card: orchestrate executors",
        option: "orchestrated",
        session: "claude-1",
      },
    ],
  ]);
  assert.equal(chosen.card.state, "chosen");
  assert.equal(chosen.card.chosen, "orchestrated");
  assert.equal(chosen.card.error, null);
  assert.equal(chosen.choice.option, "orchestrated");
  assert.deepEqual(
    events.map((event) => event.card.state),
    ["saving", "chosen"]
  );
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], "claude-1");
  assert.match(sent[0][1], /You are the orchestrator/u);
  assert.match(sent[0][1], /assignment:next/u);
  assert.match(sent[0][1], /isolation worktree/u);
  // A chosen card is not offered any more.
  assert.equal(
    (
      await choice.choose({
        generation: 1,
        option: "sequential",
        sessionId: "claude-1",
        workspaceId: "w1",
      })
    ).code,
    "MODE_CHOICE_UNAVAILABLE"
  );
  // The agent's turn ends without an open proposal: the card leaves.
  await turn("claude-1");
  assert.equal(card("w1"), null);
  assert.equal(events.at(-1).card, null);

  // A typed message dismisses the offered card; the proposal stays unchosen.
  proposals.set(
    "/work/one",
    view({
      generation: 2,
      recommended: "sequential",
      options: ["sequential", "orchestrated", "refine"],
    })
  );
  await turn("claude-2");
  assert.equal(card("w1").sessionId, "claude-2");
  assert.equal(card("w1").options[0].id, "sequential");
  choice.userMessage("claude-1");
  assert.equal(card("w1").state, "offered");
  choice.userMessage("claude-2");
  assert.equal(card("w1").state, "dismissed");
  assert.equal(events.at(-1).card.state, "dismissed");
  await turn("claude-2");
  assert.equal(card("w1").state, "dismissed");
  // A new proposal offers the card again.
  proposals.set(
    "/work/one",
    view({
      generation: 3,
      hasParallelWork: false,
      options: ["sequential", "refine"],
      recommended: "sequential",
    })
  );
  await turn("claude-2");
  assert.equal(card("w1").state, "offered");
  assert.equal(card("w1").generation, 3);

  // Sequential and refine send their own messages.
  sent.length = 0;
  assert.equal(
    (
      await choice.choose({
        generation: 3,
        option: "refine",
        sessionId: "claude-2",
        workspaceId: "w1",
      })
    ).ok,
    true
  );
  assert.match(sent[0][1], /refine the specification first/u);
  assert.match(sent[0][1], /scope:propose/u);
  proposals.set(
    "/work/one",
    view({
      generation: 4,
      hasParallelWork: false,
      options: ["sequential", "refine"],
      recommended: "sequential",
    })
  );
  await turn("claude-2");
  await choice.choose({
    generation: 4,
    option: "sequential",
    sessionId: "claude-2",
    workspaceId: "w1",
  });
  assert.match(sent[1][1], /task by task, starting now with the first task/u);
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
