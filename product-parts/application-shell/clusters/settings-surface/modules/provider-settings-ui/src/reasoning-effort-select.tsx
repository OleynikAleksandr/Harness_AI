import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { REASONING_EFFORT_OPTIONS } from "./settings-model-options.js";

interface ReasoningEffortSelectProps {
  disabled?: boolean;
  onChange: (value: ReasoningEffort) => void;
  value: ReasoningEffort;
  values?: readonly ReasoningEffort[];
}

interface MenuRect {
  left: number;
  top: number;
  width: number;
}

export function ReasoningEffortSelect({
  disabled = false,
  onChange,
  value,
  values,
}: ReasoningEffortSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<MenuRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Without an explicit per-model list, ultracode stays hidden (Opus-only).
  const options = values
    ? REASONING_EFFORT_OPTIONS.filter((option) => values.includes(option.value))
    : REASONING_EFFORT_OPTIONS.filter((option) => option.value !== "ultracode");
  const selected =
    options.find((option) => option.value === value) ??
    options[0] ??
    REASONING_EFFORT_OPTIONS[1];

  useLayoutEffect(() => {
    if (!(open && triggerRef.current)) {
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuRect({ left: rect.left, top: rect.bottom + 4, width: rect.width });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !(
          triggerRef.current?.contains(target) ||
          menuRef.current?.contains(target)
        )
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const closeOnReflow = () => setOpen(false);

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnReflow);
    window.addEventListener("scroll", closeOnReflow, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnReflow);
      window.removeEventListener("scroll", closeOnReflow, true);
    };
  }, [open]);

  return (
    <div className="settings-reasoning-select">
      <button
        aria-expanded={open}
        className="settings-reasoning-trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        {selected.label}
      </button>
      {open && menuRect
        ? createPortal(
            <div
              className="settings-reasoning-menu"
              ref={menuRef}
              role="menu"
              style={{
                left: menuRect.left,
                minWidth: menuRect.width,
                top: menuRect.top,
              }}
            >
              {options.map((option) => (
                <button
                  aria-checked={option.value === value}
                  className={
                    option.value === value
                      ? "is-selected settings-reasoning-option"
                      : "settings-reasoning-option"
                  }
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
