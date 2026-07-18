import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = ts
  .transpileModule(
    readFileSync(
      new URL("./session-dialog-autoscroll.ts", import.meta.url),
      "utf8"
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  )
  .outputText.replace(
    'from "react";',
    `from "data:text/javascript;base64,${Buffer.from(`
    export function useEffect() {}
    export function useLayoutEffect() {}
    export function useMemo(factory) { return factory(); }
    export function useRef(value) { return { current: value }; }
    export function useState(value) { return [value, () => undefined]; }
  `).toString("base64")}";`
  );

const {
  buildSessionDialogScrollAnchor,
  resolveLowestDialogBubbleBottomScrollTop,
  resolveSessionDialogPinnedState,
  scrollSessionDialogToLowestBubbleBottom,
} = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

function message(id, role, text, options = {}) {
  return {
    id,
    role,
    text,
    timestamp: `2026-07-02T00:00:0${id}.000Z`,
    ...options,
  };
}

function bubble(bottom) {
  return {
    getBoundingClientRect() {
      return { bottom };
    },
  };
}

function container({ bubbles, clientHeight, scrollHeight, scrollTop = 0 }) {
  return {
    clientHeight,
    scrollHeight,
    scrollTop,
    getBoundingClientRect() {
      return { top: 0 };
    },
    querySelectorAll(selector) {
      // The bottom anchor must see the subagent launch divider too, not
      // only message bubbles (2026-07-18 acceptance defect).
      assert.equal(
        selector,
        ".session-dialog__message, .session-subagent-divider"
      );
      return bubbles;
    },
  };
}

const baseMessages = [
  message("1", "thinking", "Проверяю план."),
  message("2", "assistant", "Работаю дальше."),
];
const grownEarlierThinking = [
  message("1", "thinking", "Проверяю план.\nДобавляю позднее размышление."),
  message("2", "assistant", "Работаю дальше."),
];

assert.notEqual(
  buildSessionDialogScrollAnchor(baseMessages),
  buildSessionDialogScrollAnchor(grownEarlierThinking)
);

assert.equal(
  resolveSessionDialogPinnedState({
    distanceFromBottom: 160,
    epsilon: 32,
    previousPinned: true,
    userScrollIntent: false,
  }),
  true
);
assert.equal(
  resolveSessionDialogPinnedState({
    distanceFromBottom: 160,
    epsilon: 32,
    previousPinned: true,
    userScrollIntent: true,
  }),
  false
);

const scrollContainer = container({
  bubbles: [bubble(240), bubble(420), bubble(380)],
  clientHeight: 300,
  scrollHeight: 480,
});
assert.equal(resolveLowestDialogBubbleBottomScrollTop(scrollContainer), 144);
scrollSessionDialogToLowestBubbleBottom(scrollContainer);
assert.equal(scrollContainer.scrollTop, 144);

assert.equal(
  resolveLowestDialogBubbleBottomScrollTop(
    container({
      bubbles: [bubble(520)],
      clientHeight: 300,
      scrollHeight: 540,
    })
  ),
  240
);

// A subagent launch divider sitting below the last bubble is the lowest
// anchored element: the scroll target must reveal it, exactly as if it were
// a bubble (both selectors resolve through the same query).
assert.equal(
  resolveLowestDialogBubbleBottomScrollTop(
    container({
      bubbles: [bubble(240), bubble(380), bubble(430)],
      clientHeight: 300,
      scrollHeight: 480,
    })
  ),
  154
);
