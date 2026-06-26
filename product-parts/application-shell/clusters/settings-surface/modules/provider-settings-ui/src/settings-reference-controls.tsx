import { type ReactNode, useEffect, useState } from "react";

export interface ModelRowOption {
  description?: string;
  id: string;
  label: string;
}

type ModelRowsOption = ModelRowOption | string;

export function SettingsCard({
  children,
  action,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SettingsButton({
  children,
  disabled = false,
  onClick,
  variant = "secondary",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      className={
        variant === "primary" ? "settings-button primary" : "settings-button"
      }
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function SettingsSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SettingsTextField({
  label,
  onChange,
  password = false,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  password?: boolean;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={password ? "password" : "text"}
        value={value}
      />
    </label>
  );
}

export function SettingsToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description?: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-toggle-row">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}

export function ModelRows({
  description,
  note,
  onChange,
  options,
  value,
}: {
  description: string;
  note?: string;
  onChange: (value: string) => void;
  options: readonly ModelRowsOption[];
  value: string;
}) {
  const resolvedOptions = options.map(normalizeModelOption);
  return (
    <>
      <p className="settings-description">{description}</p>
      <div className="settings-list">
        {resolvedOptions.map((option) => (
          <button
            aria-pressed={option.id === value}
            className={
              option.id === value
                ? "active settings-model-row"
                : "settings-model-row"
            }
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <span className="settings-model-title">{option.label}</span>
            <span className="settings-model-id">{option.id}</span>
            {option.description ? (
              <p className="settings-model-description">{option.description}</p>
            ) : null}
          </button>
        ))}
      </div>
      {note ? <p className="settings-note">{note}</p> : null}
    </>
  );
}

export function ManualIntegerField({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft.trim());
    if (!Number.isInteger(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(clamped);
    setDraft(String(clamped));
  };

  return (
    <label className="settings-field compact">
      <span>{label}</span>
      <input
        inputMode="numeric"
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
        pattern="[0-9]*"
        type="text"
        value={draft}
      />
    </label>
  );
}

function normalizeModelOption(option: ModelRowsOption): ModelRowOption {
  return typeof option === "string" ? { id: option, label: option } : option;
}
