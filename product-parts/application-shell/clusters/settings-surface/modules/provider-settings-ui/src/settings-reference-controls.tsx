import { type ReactNode, useEffect, useState } from "react";

export function SettingsCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>{title}</h3>
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
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  password?: boolean;
  value: string;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        type={password ? "password" : "text"}
        value={value}
      />
    </label>
  );
}

export function SettingsTextarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
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
  onChange,
  options,
  value,
}: {
  description: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  const resolvedOptions = options.includes(value)
    ? options
    : [value, ...options];
  return (
    <>
      <p className="settings-description">{description}</p>
      <div className="settings-list">
        {resolvedOptions.map((option) => (
          <button
            aria-pressed={option === value}
            className={
              option === value
                ? "active settings-model-row"
                : "settings-model-row"
            }
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            <span className="settings-model-title">{option}</span>
            <span className="settings-model-id">{option}</span>
          </button>
        ))}
      </div>
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
