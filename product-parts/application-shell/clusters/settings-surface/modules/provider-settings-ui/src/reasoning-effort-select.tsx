import { useEffect, useRef, useState } from "react";
import type { ReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { REASONING_EFFORT_OPTIONS } from "./settings-model-options.js";

interface ReasoningEffortSelectProps {
  disabled?: boolean;
  onChange: (value: ReasoningEffort) => void;
  value: ReasoningEffort;
}

export function ReasoningEffortSelect({
  disabled = false,
  onChange,
  value,
}: ReasoningEffortSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected =
    REASONING_EFFORT_OPTIONS.find((option) => option.value === value) ??
    REASONING_EFFORT_OPTIONS[1];

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="settings-reasoning-select" ref={rootRef}>
      <button
        aria-expanded={open}
        className="settings-reasoning-trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {selected.label}
      </button>
      {open ? (
        <div className="settings-reasoning-menu" role="menu">
          {REASONING_EFFORT_OPTIONS.map((option) => (
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
        </div>
      ) : null}
    </div>
  );
}
