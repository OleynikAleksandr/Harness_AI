import type { ResponsesInputItem } from "./codex-uc-responses.js";

export function rollbackResponsesInputItems(
  items: readonly ResponsesInputItem[],
  numTurns: number
): ResponsesInputItem[] {
  let remainingTurns = numTurns;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!isUserInputItem(items[index])) {
      continue;
    }
    remainingTurns -= 1;
    if (remainingTurns === 0) {
      return items.slice(0, index);
    }
  }
  return [];
}

function isUserInputItem(item: ResponsesInputItem): item is {
  readonly content: string;
  readonly role: "user";
} {
  return "role" in item && item.role === "user";
}
