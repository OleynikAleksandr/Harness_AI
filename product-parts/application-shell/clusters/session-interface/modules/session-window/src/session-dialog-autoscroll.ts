import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SessionMessage } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";

const AUTO_SCROLL_EPSILON = 32;
const BUBBLE_SHADOW_RESERVE_PX = 24;
const HASH_MODULUS = 4_294_967_291;
// The bottom anchor tracks every timeline element the dialog renders, not
// just message bubbles: the subagent launch divider appears below the last
// bubble and must scroll into view too (2026-07-18 acceptance defect).
const SCROLL_ANCHOR_SELECTOR =
  ".session-dialog__message, .session-subagent-divider";

export function useSessionDialogAutoscroll(
  displayMessages: readonly SessionMessage[]
): {
  readonly onScroll: () => void;
  readonly scrollContainerRef: React.RefObject<HTMLDivElement | null>;
} {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const pinnedToBottomRef = useRef(true);
  const userScrollIntentRef = useRef(false);
  const userScrollIntentTimerRef = useRef<number | null>(null);
  const displayMessageCount = displayMessages.length;

  const updatePinnedState = () => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const nextPinned = resolveSessionDialogPinnedState({
      distanceFromBottom,
      epsilon: AUTO_SCROLL_EPSILON,
      previousPinned: pinnedToBottomRef.current,
      userScrollIntent: userScrollIntentRef.current,
    });
    pinnedToBottomRef.current = nextPinned;
    setPinnedToBottom((current) =>
      current === nextPinned ? current : nextPinned
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!(container && displayMessageCount > 0)) {
      return undefined;
    }

    const markUserScrollIntent = () => {
      userScrollIntentRef.current = true;
      if (userScrollIntentTimerRef.current !== null) {
        window.clearTimeout(userScrollIntentTimerRef.current);
      }
      userScrollIntentTimerRef.current = window.setTimeout(() => {
        userScrollIntentRef.current = false;
        userScrollIntentTimerRef.current = null;
      }, 800);
    };

    container.addEventListener("pointerdown", markUserScrollIntent);
    container.addEventListener("touchmove", markUserScrollIntent, {
      passive: true,
    });
    container.addEventListener("wheel", markUserScrollIntent, {
      passive: true,
    });
    return () => {
      container.removeEventListener("pointerdown", markUserScrollIntent);
      container.removeEventListener("touchmove", markUserScrollIntent);
      container.removeEventListener("wheel", markUserScrollIntent);
      if (userScrollIntentTimerRef.current !== null) {
        window.clearTimeout(userScrollIntentTimerRef.current);
      }
    };
  }, [displayMessageCount]);

  const scrollAnchor = useMemo(
    () => buildSessionDialogScrollAnchor(displayMessages),
    [displayMessages]
  );

  useLayoutEffect(() => {
    if (!pinnedToBottom) {
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    if (scrollAnchor === "empty") {
      container.scrollTop = 0;
      return;
    }
    scrollSessionDialogToLowestBubbleBottom(container);
  }, [pinnedToBottom, scrollAnchor]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!(container && displayMessageCount > 0)) {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      if (pinnedToBottomRef.current) {
        scrollSessionDialogToLowestBubbleBottom(container);
      }
    });
    for (const child of Array.from(
      container.querySelectorAll(SCROLL_ANCHOR_SELECTOR)
    )) {
      observer.observe(child);
    }
    return () => {
      observer.disconnect();
    };
  }, [displayMessageCount]);

  return { onScroll: updatePinnedState, scrollContainerRef };
}

export function buildSessionDialogScrollAnchor(
  messages: readonly SessionMessage[]
): string {
  if (messages.length === 0) {
    return "empty";
  }
  return messages
    .map((message) =>
      [
        message.id,
        message.role,
        message.tag ?? "",
        hashContent(resolveVisibleMessageText(message)),
      ].join(":")
    )
    .join("|");
}

export function resolveSessionDialogPinnedState(options: {
  readonly distanceFromBottom: number;
  readonly epsilon: number;
  readonly previousPinned: boolean;
  readonly userScrollIntent: boolean;
}): boolean {
  if (options.distanceFromBottom <= options.epsilon) {
    return true;
  }
  return options.userScrollIntent ? false : options.previousPinned;
}

export function resolveLowestDialogBubbleBottomScrollTop(
  container: HTMLElement,
  shadowReservePx = BUBBLE_SHADOW_RESERVE_PX
): number {
  const maxScrollTop = Math.max(
    0,
    container.scrollHeight - container.clientHeight
  );
  const bubbleBottom = resolveLowestBubbleBottom(container);
  if (bubbleBottom === null) {
    return maxScrollTop;
  }
  return clampScrollTop(
    bubbleBottom + shadowReservePx - container.clientHeight,
    {
      maxScrollTop,
    }
  );
}

export function scrollSessionDialogToLowestBubbleBottom(
  container: HTMLElement
): void {
  container.scrollTop = resolveLowestDialogBubbleBottomScrollTop(container);
}

function resolveLowestBubbleBottom(container: HTMLElement): number | null {
  const containerTop = container.getBoundingClientRect().top;
  let bottom: number | null = null;
  for (const bubble of Array.from(
    container.querySelectorAll<HTMLElement>(SCROLL_ANCHOR_SELECTOR)
  )) {
    const bubbleBottom =
      bubble.getBoundingClientRect().bottom -
      containerTop +
      container.scrollTop;
    bottom = bottom === null ? bubbleBottom : Math.max(bottom, bubbleBottom);
  }
  return bottom;
}

function clampScrollTop(
  value: number,
  options: { readonly maxScrollTop: number }
): number {
  return Math.min(options.maxScrollTop, Math.max(0, value));
}

function resolveVisibleMessageText(message: SessionMessage): string {
  return message.localizedContent?.trim()
    ? message.localizedContent
    : message.text;
}

function hashContent(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % HASH_MODULUS;
  }
  return hash;
}
