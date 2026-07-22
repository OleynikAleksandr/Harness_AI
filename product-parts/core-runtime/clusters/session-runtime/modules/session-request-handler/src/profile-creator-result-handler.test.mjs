import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const handlerSource = readFileSync(
  new URL("./profile-creator-result-handler.ts", import.meta.url),
  "utf8"
);
const routerSource = readFileSync(
  new URL("./session-provider-event-router.ts", import.meta.url),
  "utf8"
);
const claudeRouterSource = readFileSync(
  new URL(
    "../../../../../../provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/messaging/claude-stream-event-router.ts",
    import.meta.url
  ),
  "utf8"
);
const codexRouterSource = readFileSync(
  new URL(
    "../../../../../../provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-app-server-event-router.ts",
    import.meta.url
  ),
  "utf8"
);
const codexFacadeSource = readFileSync(
  new URL(
    "../../../../../../provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-app-server-facade.ts",
    import.meta.url
  ),
  "utf8"
);
const codexProjectorSource = readFileSync(
  new URL(
    "../../../../../../provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-agent-message-projector.ts",
    import.meta.url
  ),
  "utf8"
);
const codexProjectorCompiled = ts.transpileModule(codexProjectorSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { projectCompletedCodexAgentMessage } = await import(
  `data:text/javascript;base64,${Buffer.from(codexProjectorCompiled).toString("base64")}`
);

assert.match(claudeRouterSource, /this\.emitRawStructuredOutput\(/u);
assert.match(claudeRouterSource, /type: "structured_output"/u);
assert.match(claudeRouterSource, /output,/u);
assert.match(
  codexFacadeSource,
  /state\.structuredOutputExpected = outputSchema !== undefined/u
);
assert.match(codexRouterSource, /projectCompletedCodexAgentMessage/u);
const state = {
  assistantTextByItemId: new Map(),
  structuredOutputExpected: true,
};
const commentaryProjection = projectCompletedCodexAgentMessage(
  "thread-1",
  {
    id: "message-commentary",
    phase: "commentary",
    text: JSON.stringify({
      assistantResponse: "Промежуточный ответ",
      draft: null,
      nextAction: "continue",
    }),
  },
  state
);
assert.equal(commentaryProjection.type, "structured_output");
assert.equal(commentaryProjection.phase, "commentary");
assert.equal(
  commentaryProjection.output.assistantResponse,
  "Промежуточный ответ"
);
assert.equal(state.structuredOutputExpected, true);
const structuredProjection = projectCompletedCodexAgentMessage(
  "thread-1",
  {
    id: "message-1",
    phase: "final_answer",
    text: JSON.stringify({
      assistantResponse: "Строка 1\n\n- пункт",
      draft: null,
      nextAction: "continue",
    }),
  },
  state
);
assert.equal(structuredProjection.type, "structured_output");
assert.equal(structuredProjection.phase, "final_answer");
assert.equal(
  structuredProjection.output.assistantResponse,
  "Строка 1\n\n- пункт"
);
assert.equal(state.structuredOutputExpected, false);
const ordinaryProjection = projectCompletedCodexAgentMessage(
  "thread-1",
  {
    id: "message-2",
    phase: "final_answer",
    text: "Обычный ответ",
  },
  state
);
assert.equal(ordinaryProjection.type, "dialog_message");
assert.equal(ordinaryProjection.content, "Обычный ответ");

assert.match(handlerSource, /class ProfileCreatorResultHandler/u);
assert.match(handlerSource, /sessionPurpose\?\.type !== "profile-creator"/u);
assert.match(handlerSource, /this\.agent\.parseTurnResult\(event\.output\)/u);
assert.match(
  handlerSource,
  /const commentary = event\.phase === "commentary"/u
);
assert.match(handlerSource, /if \(commentary\) \{\s+return true;\s+\}/u);
assert.match(handlerSource, /commentary \? \{ tag: "commentary" \} : \{\}/u);
assert.match(handlerSource, /applyCreatorSnapshot\(\{/u);
assert.ok(
  handlerSource.indexOf("if (commentary)") <
    handlerSource.indexOf("if (parsed.result.draft)")
);
assert.match(handlerSource, /role: "assistant"/u);
assert.match(handlerSource, /role: "system"/u);
assert.match(handlerSource, /draft unchanged/u);
assert.match(handlerSource, /buildProviderTurnOptions\(session\)/u);
assert.match(handlerSource, /repairPendingSessions/u);
assert.match(
  routerSource,
  /profileCreatorResultHandler\.handle\(context, sessionId, event\)/u
);

console.log("profile-creator-result-handler tests: OK");
