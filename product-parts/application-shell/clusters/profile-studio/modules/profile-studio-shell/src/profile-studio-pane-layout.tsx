import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type PaneSide = "left" | "right";

interface PaneWidths {
  readonly left: number;
  readonly right: number;
}

interface ProfileStudioPaneLayoutProps {
  readonly center: ReactNode;
  readonly left: ReactNode;
  readonly overlay?: ReactNode;
  readonly right: ReactNode;
}

const DEFAULT_PANES: PaneWidths = { left: 248, right: 370 };
const MIN_PANES: PaneWidths = { left: 218, right: 300 };
const MIN_CENTER_WIDTH = 360;
const RESIZER_TOTAL_WIDTH = 12;
const KEYBOARD_STEP = 16;

export function ProfileStudioPaneLayout({
  center,
  left,
  overlay,
  right,
}: ProfileStudioPaneLayoutProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    readonly pointerId: number;
    readonly side: PaneSide;
    readonly startWidth: number;
    readonly startX: number;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [paneWidths, setPaneWidths] = useState(DEFAULT_PANES);
  const [activeSide, setActiveSide] = useState<PaneSide | null>(null);

  const resizePane = useCallback(
    (side: PaneSide, requestedWidth: number) => {
      setPaneWidths((current) => {
        const nextWidth = clamp(
          requestedWidth,
          MIN_PANES[side],
          maximumPaneWidth(side, current, containerWidth)
        );
        return current[side] === nextWidth
          ? current
          : { ...current, [side]: nextWidth };
      });
    },
    [containerWidth]
  );

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? shell.clientWidth;
      setContainerWidth(width);
      setPaneWidths((current) => constrainPanes(current, width));
    });
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  function beginResize(side: PaneSide, event: PointerEvent<HTMLHRElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      side,
      startWidth: paneWidths[side],
      startX: event.clientX,
    };
    setActiveSide(side);
  }

  function continueResize(event: PointerEvent<HTMLHRElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const pointerDelta = event.clientX - drag.startX;
    resizePane(
      drag.side,
      drag.startWidth + (drag.side === "left" ? pointerDelta : -pointerDelta)
    );
  }

  function endResize(event: PointerEvent<HTMLHRElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setActiveSide(null);
  }

  function resizeWithKeyboard(
    side: PaneSide,
    event: KeyboardEvent<HTMLHRElement>
  ) {
    if (!(event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    resizePane(
      side,
      paneWidths[side] +
        (side === "left" ? direction : -direction) * KEYBOARD_STEP
    );
  }

  const style = {
    "--profile-studio-left-pane": `${paneWidths.left}px`,
    "--profile-studio-right-pane": `${paneWidths.right}px`,
  } as CSSProperties;

  return (
    <section
      aria-label="Profile Studio"
      className="profile-studio-shell"
      ref={shellRef}
      style={style}
    >
      {left}
      <PaneResizer
        active={activeSide === "left"}
        maximum={maximumPaneWidth("left", paneWidths, containerWidth)}
        onDoubleClick={() => resizePane("left", DEFAULT_PANES.left)}
        onKeyDown={(event) => resizeWithKeyboard("left", event)}
        onPointerCancel={endResize}
        onPointerDown={(event) => beginResize("left", event)}
        onPointerMove={continueResize}
        onPointerUp={endResize}
        side="left"
        value={paneWidths.left}
      />
      {center}
      <PaneResizer
        active={activeSide === "right"}
        maximum={maximumPaneWidth("right", paneWidths, containerWidth)}
        onDoubleClick={() => resizePane("right", DEFAULT_PANES.right)}
        onKeyDown={(event) => resizeWithKeyboard("right", event)}
        onPointerCancel={endResize}
        onPointerDown={(event) => beginResize("right", event)}
        onPointerMove={continueResize}
        onPointerUp={endResize}
        side="right"
        value={paneWidths.right}
      />
      {right}
      {overlay}
    </section>
  );
}

function PaneResizer({
  active,
  maximum,
  side,
  value,
  ...events
}: {
  readonly active: boolean;
  readonly maximum: number;
  readonly side: PaneSide;
  readonly value: number;
  readonly onDoubleClick: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLHRElement>) => void;
  readonly onPointerCancel: (event: PointerEvent<HTMLHRElement>) => void;
  readonly onPointerDown: (event: PointerEvent<HTMLHRElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLHRElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLHRElement>) => void;
}) {
  return (
    <hr
      {...events}
      aria-label={`Resize ${side} Profile Studio pane`}
      aria-orientation="vertical"
      aria-valuemax={maximum}
      aria-valuemin={MIN_PANES[side]}
      aria-valuenow={value}
      className={`profile-studio-resizer${active ? "is-active" : ""}`}
      tabIndex={0}
    />
  );
}

function constrainPanes(
  current: PaneWidths,
  containerWidth: number
): PaneWidths {
  const left = clamp(
    current.left,
    MIN_PANES.left,
    maximumPaneWidth("left", current, containerWidth)
  );
  const withLeft = { ...current, left };
  const right = clamp(
    current.right,
    MIN_PANES.right,
    maximumPaneWidth("right", withLeft, containerWidth)
  );
  return left === current.left && right === current.right
    ? current
    : { left, right };
}

function maximumPaneWidth(
  side: PaneSide,
  widths: PaneWidths,
  containerWidth: number
): number {
  const opposite = side === "left" ? widths.right : widths.left;
  return Math.max(
    MIN_PANES[side],
    containerWidth - opposite - MIN_CENTER_WIDTH - RESIZER_TOTAL_WIDTH
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
