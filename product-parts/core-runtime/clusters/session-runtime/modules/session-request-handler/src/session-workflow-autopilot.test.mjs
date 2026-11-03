import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { buildWorkflowModules } from "../../../../project-workflow/modules/workflow-platform/src/workflow-test-build.mjs";

const AUTOPILOT_IMPORT =
  /import \{[^}]*\} from "[^"]*workflow-autopilot-facade\.js";\n/u;
const HOST_IMPORT = /import \{[^}]*\} from "[^"]*workflow-host-facade\.js";\n/u;
const source = readFileSync(
  new URL("./session-workflow-autopilot.ts", import.meta.url),
  "utf8"
);
assert.match(source, AUTOPILOT_IMPORT);
assert.match(source, HOST_IMPORT);
const build = await buildWorkflowModules(
  ["workflow-autopilot"],
  "session-workflow-autopilot"
);
try {
  const autopilotUrl = pathToFileURL(
    path.join(
      build.directory,
      "workflow-autopilot",
      "src",
      "workflow-autopilot-facade.js"
    )
  ).href;
  const compiled = ts.transpileModule(
    source
      .replace(
        AUTOPILOT_IMPORT,
        `import { workflowAutopilotFacade } from ${JSON.stringify(autopilotUrl)};\n`
      )
      .replace(HOST_IMPORT, "const workflowHostFacade = null;\n"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  const file = path.join(build.directory, "session-workflow-autopilot.js");
  writeFileSync(file, compiled, "utf8");
  const { SessionWorkflowAutopilot, WORKFLOW_AUTOPILOT_EVENT_TYPE } =
    await import(pathToFileURL(file).href);
  assert.equal(WORKFLOW_AUTOPILOT_EVENT_TYPE, "workflow:autopilot");

  const flush = async () => {
    for (let index = 0; index < 20; index += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  };
  const status = (overrides = {}) => ({
    blockedReason: null,
    delivery: "IN_PROGRESS",
    head: "h1",
    nextTask: { id: "T1", kind: "work", status: "TODO", title: "First" },
    revision: 1,
    scope: "ACTIVE",
    transactionPending: false,
    ...overrides,
  });
  function setup() {
    const host = {
      calls: [],
      current: status(),
      bundle: (root) => ({
        file: `${root}/kit`,
        source: root === "/nokit" ? "app" : "project",
      }),
      run: (args, options) => {
        host.calls.push([args[0], options.root]);
        if (args[0] === "autopilot:status") {
          return Promise.resolve({
            command: "x",
            ok: true,
            result: host.current,
          });
        }
        return Promise.resolve({
          command: "x",
          ok: true,
          result: { text: "PACKET" },
        });
      },
    };
    const sessions = new Map([
      ["s1", { id: "s1", workspacePath: "/work" }],
      ["sub", { id: "sub", sessionKind: "subagent", workspacePath: "/work" }],
      [
        "creator",
        {
          id: "creator",
          sessionPurpose: { kind: "profile-creator" },
          workspacePath: "/work",
        },
      ],
      ["bare", { id: "bare", workspacePath: "/nokit" }],
    ]);
    const sent = [];
    const events = [];
    const autopilot = new SessionWorkflowAutopilot(host);
    autopilot.attach({
      getSession: (id) => sessions.get(id),
      send: (id, text) => sent.push([id, text]),
    });
    autopilot.subscribe((event) => events.push(event));
    // A turn the autopilot sent reaches the provider like a user message.
    const dispatch = (id, text) =>
      autopilot.turnDispatched(sessions.get(id), text);
    return { autopilot, dispatch, events, host, sent, sessions };
  }

  // Off by default: turns run without Kit calls or continues.
  {
    const { autopilot, dispatch, host, sent } = setup();
    assert.equal(autopilot.get("s1").enabled, false);
    dispatch("s1", "hello");
    autopilot.turnFinished("s1", "completed");
    await flush();
    assert.deepEqual(sent, []);
    assert.deepEqual(host.calls, []);
  }

  // Enabling an idle session starts the first task; each completed turn
  // with progress continues; no progress stops the chain.
  {
    const { autopilot, dispatch, events, host, sent } = setup();
    const enabled = await autopilot.setEnabled("s1", true);
    assert.equal(enabled.enabled, true);
    assert.equal(enabled.continues, 1);
    assert.equal(sent.length, 1);
    assert.match(sent[0][1], /task:start T1/u);
    assert.match(sent[0][1], /PACKET/u);
    assert.equal(events.at(-1).type, "workflow:autopilot");
    assert.equal(events.at(-1).lastDecision.action, "continue");

    dispatch("s1", sent[0][1]);
    assert.equal(autopilot.get("s1").running, true);
    await flush();
    host.current = status({
      head: "h2",
      nextTask: { id: "T2", kind: "work", status: "TODO", title: "Second" },
      revision: 2,
    });
    autopilot.turnFinished("s1", "completed");
    await flush();
    assert.equal(sent.length, 2);
    assert.match(sent[1][1], /T2/u);
    assert.equal(autopilot.get("s1").continues, 2);

    dispatch("s1", sent[1][1]);
    await flush();
    autopilot.turnFinished("s1", "completed");
    await flush();
    assert.equal(sent.length, 2);
    assert.equal(autopilot.get("s1").lastDecision.reason, "no-progress");
    // A second terminal event of the same turn changes nothing.
    autopilot.turnFinished("s1", "error");
    await flush();
    assert.equal(autopilot.get("s1").lastDecision.reason, "no-progress");
  }

  // The user writing during an autopilot turn makes it yield.
  {
    const { autopilot, dispatch, host, sent } = setup();
    await autopilot.setEnabled("s1", true);
    dispatch("s1", sent[0][1]);
    dispatch("s1", "wait, change of plans");
    await flush();
    host.current = status({ head: "h9", revision: 9 });
    autopilot.turnFinished("s1", "completed");
    await flush();
    assert.equal(sent.length, 1);
    assert.equal(autopilot.get("s1").lastDecision.reason, "user-message");
  }

  // A user turn (not an interjection) is followed by the autopilot.
  {
    const { autopilot, dispatch, host, sent } = setup();
    host.current = status({ delivery: "READY_FOR_ACCEPTANCE" });
    await autopilot.setEnabled("s1", true);
    assert.equal(
      autopilot.get("s1").lastDecision.reason,
      "ready-for-acceptance"
    );
    dispatch("s1", "fix the typo please");
    await flush();
    host.current = status({ head: "h5", revision: 5 });
    autopilot.turnFinished("s1", "completed");
    await flush();
    assert.equal(sent.length, 1);
    assert.match(sent[0][1], /T1/u);
  }

  // Stop and provider errors end the chain with turn-error.
  {
    const { autopilot, dispatch, host, sent } = setup();
    await autopilot.setEnabled("s1", true);
    dispatch("s1", sent[0][1]);
    host.current = status({ head: "h3", revision: 3 });
    autopilot.turnCancelled("s1");
    await flush();
    assert.equal(autopilot.get("s1").lastDecision.reason, "turn-error");
    assert.match(autopilot.get("s1").lastDecision.detail, /cancelled/u);
    autopilot.turnCancelled("s1");
    dispatch("s1", "again");
    await flush();
    autopilot.turnFinished("s1", "error");
    await flush();
    assert.equal(sent.length, 1);
    assert.match(autopilot.get("s1").lastDecision.detail, /provider error/u);
  }

  // Disabling stops further turns; ineligible sessions and workspaces
  // without the Kit never continue.
  {
    const { autopilot, dispatch, host, sent } = setup();
    await autopilot.setEnabled("s1", true);
    dispatch("s1", sent[0][1]);
    await autopilot.setEnabled("s1", false);
    host.current = status({ head: "h4", revision: 4 });
    autopilot.turnFinished("s1", "completed");
    await flush();
    assert.equal(sent.length, 1);
    assert.equal(autopilot.get("s1").enabled, false);

    for (const id of ["sub", "creator"]) {
      await autopilot.setEnabled(id, true);
      dispatch(id, "x");
      autopilot.turnFinished(id, "completed");
    }
    await flush();
    assert.equal(sent.length, 1);
    const bare = await autopilot.setEnabled("bare", true);
    assert.equal(bare.lastDecision.reason, "blocked");
    assert.match(bare.lastDecision.detail, /no Workflow Kit/u);
  }
} finally {
  await build.cleanup();
}

// Wiring: dispatch, finish, stop and the continue turn route.
const lifecycleSource = readFileSync(
  new URL("./session-provider-binding-lifecycle.ts", import.meta.url),
  "utf8"
);
const routerSource = readFileSync(
  new URL("./session-provider-event-router.ts", import.meta.url),
  "utf8"
);
const stopSource = readFileSync(
  new URL("./session-turn-stop.ts", import.meta.url),
  "utf8"
);
assert.match(
  lifecycleSource,
  /this\.autopilot\.turnDispatched\(session, text\)/u
);
assert.match(
  lifecycleSource,
  /this\.autopilot\.turnFinished\(sessionId, outcome\)/u
);
assert.match(
  lifecycleSource,
  /send: \(sessionId, text\) => this\.sendAutopilotTurn\(sessionId, text\)/u
);
assert.match(
  routerSource,
  /context\.onTurnFinished\?\.\(sessionId, "completed"\)/u
);
assert.equal(
  routerSource.match(/context\.onTurnFinished\?\.\(sessionId, "error"\)/gu)
    ?.length,
  2
);
assert.match(
  stopSource,
  /sessionWorkflowAutopilot\.turnCancelled\(sessionId\)/u
);
