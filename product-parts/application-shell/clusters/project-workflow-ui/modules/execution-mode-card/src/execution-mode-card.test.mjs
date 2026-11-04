import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cardSource = readFileSync(
  new URL("./execution-mode-card-facade.tsx", import.meta.url),
  "utf8"
);
const stateSource = readFileSync(
  new URL("./execution-mode-card-state.ts", import.meta.url),
  "utf8"
);
const cssSource = readFileSync(
  new URL("./execution-mode-card.css", import.meta.url),
  "utf8"
);
const windowSource = readFileSync(
  new URL(
    "../../../../session-interface/modules/session-window/src/session-window-facade.tsx",
    import.meta.url
  ),
  "utf8"
);
const dictionarySource = readFileSync(
  new URL(
    "../../../../../../core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts",
    import.meta.url
  ),
  "utf8"
);

// The card comes from Core and is replaced by its events.
assert.match(
  stateSource,
  /window\.harnessCore\s*\?\.getWorkflowModeChoice\(\{ workspaceId \}\)/u
);
assert.match(
  stateSource,
  /event\.type === "workflow:mode-choice" &&\s*event\.workspaceId === workspaceId/u
);
assert.match(stateSource, /setCard\(event\.card\)/u);
// A click forwards only the option with the card's own generation and owner.
assert.match(
  stateSource,
  /chooseWorkflowMode\(\{\s*generation: card\.generation,\s*option,\s*sessionId: card\.sessionId,\s*workspaceId,\s*\}\)/u
);
assert.match(stateSource, /setCard\(result\.card\)/u);
assert.match(stateSource, /return result\.message;/u);

// The facade renders the card it is given (the sidebar places it under the
// owner session) and forwards the click; a dismissed card is hidden.
assert.match(
  cardSource,
  /export \{ useExecutionModeCard \} from "\.\/execution-mode-card-state\.js";/u
);
assert.match(cardSource, /card: WorkflowModeChoiceCard;/u);
assert.match(cardSource, /onChoose: ExecutionModeChoice\["choose"\];/u);
assert.match(
  cardSource,
  /if \(card\.state === "dismissed"\) \{\s*return null;/u
);
assert.match(cardSource, /onChoose\(option\)/u);
assert.doesNotMatch(cardSource, /card\.sessionId !== sessionId/u);
assert.match(
  cardSource,
  /saving \? "execution-mode-card is-saving" : "execution-mode-card"/u
);
// Rows in Core order: the recommended mark, the reason under it and the
// filled button; the hint to answer in the chat.
assert.match(cardSource, /card\.options\.map\(\(option\) =>/u);
assert.match(
  cardSource,
  /"workflow\.modeCard\.recommended",\s*"\(recommended\)"/u
);
assert.match(cardSource, /option\.recommended && card\.reason/u);
assert.match(
  cardSource,
  /option\.recommended\s*\?\s*"project-workflow-primary"\s*:\s*"project-workflow-secondary"/u
);
assert.match(
  cardSource,
  /"workflow\.modeCard\.hint",\s*"or write your answer in the chat"/u
);
assert.match(cardSource, /onClick=\{\(\) => pick\(option\.id\)\}/u);
// Saving disables the buttons; a chosen card is one compact line.
assert.match(cardSource, /disabled=\{saving\}/u);
assert.match(cardSource, /card\.state === "chosen"/u);
assert.match(cardSource, /"workflow\.modeCard\.sent", "sent to the agent"/u);
assert.match(cardSource, /card\.error \?\? error/u);
assert.match(cardSource, /role="alert"/u);
assert.doesNotMatch(
  cardSource + stateSource,
  /window\.(?:alert|confirm|prompt)/u
);
// The renderer never derives options, recommendation or availability.
assert.doesNotMatch(
  cardSource + stateSource,
  /providerId|hasParallelWork|scope:choose|scripts\/workflow/u
);
// Narrow sidebar layout: stacked rows, full-width buttons, wrapping texts.
assert.match(
  cssSource,
  /\.execution-mode-card \{[^}]*margin: 4px 0 6px 13px;[^}]*overflow-wrap: anywhere;/u
);
assert.match(cssSource, /\.execution-mode-card-option \{\s*display: grid;/u);
assert.match(
  cssSource,
  /\.execution-mode-card-option button \{[^}]*width: 100%;/u
);
assert.doesNotMatch(
  cssSource,
  /white-space: nowrap|overflow-x: (?:auto|scroll)/u
);
// Orange border for the question, neutral while saving and once chosen.
assert.match(
  cssSource,
  /\.execution-mode-card \{[^}]*border: 1px solid #f0883e;/u
);
assert.match(
  cssSource,
  /\.execution-mode-card\.is-saving,\s*\.execution-mode-card--chosen \{\s*border-color: var\(--pm-border-strong\);/u
);

// Every string the card uses is in the source dictionaries.
for (const key of [
  "workflow.modeCard.choose",
  "workflow.modeCard.chosen",
  "workflow.modeCard.hint",
  "workflow.modeCard.label",
  "workflow.modeCard.question",
  "workflow.modeCard.recommended",
  "workflow.modeCard.saving",
  "workflow.modeCard.sent",
]) {
  assert.match(cardSource, new RegExp(`"${key.replaceAll(".", "\\.")}"`, "u"));
  assert.match(
    dictionarySource,
    new RegExp(`"${key.replaceAll(".", "\\.")}":`, "u")
  );
}
for (const id of ["sequential", "orchestrated", "refine"]) {
  assert.match(
    dictionarySource,
    new RegExp(`"workflow\\.modeCard\\.option\\.${id}":`, "u")
  );
  assert.match(
    dictionarySource,
    new RegExp(`"workflow\\.modeCard\\.option\\.${id}\\.description":`, "u")
  );
}

// The card lives in the sidebar (session-tree tests render it there); the
// dialog area of the session window no longer shows it.
assert.doesNotMatch(
  windowSource,
  /ExecutionModeCardFacade|execution-mode-card/u
);
assert.match(
  windowSource,
  /<WorkflowStatusStripFacade[\s\S]*?\/>\s*<SessionSurfaceFacade/u
);

console.log("execution-mode-card tests: OK");
