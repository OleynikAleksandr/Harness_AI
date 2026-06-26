import { type ReactNode, useEffect, useState } from "react";
import type { ReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { REASONING_EFFORT_OPTIONS } from "./settings-model-options.js";

export function ProviderCard({
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

export function ModelSelect({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  const resolvedOptions = options.includes(value)
    ? options
    : [value, ...options];
  return (
    <div className="settings-list">
      <p className="settings-description">
        Choose the default model used for new sessions.
      </p>
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
        </button>
      ))}
    </div>
  );
}

function SelectField({
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

export function ConnectionFields({
  apiKey,
  baseUrl,
  model,
  modelOptions,
  onChange,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  modelOptions?: readonly string[];
  onChange: (patch: {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
  }) => void;
}) {
  return (
    <>
      <TextField
        label="API Key"
        onChange={(value) => onChange({ apiKey: value })}
        password
        value={apiKey}
      />
      <TextField
        label="Base URL"
        onChange={(value) => onChange({ baseUrl: value })}
        value={baseUrl}
      />
      {modelOptions ? (
        <ModelSelect
          onChange={(value) => onChange({ defaultModel: value })}
          options={modelOptions}
          value={model}
        />
      ) : (
        <TextField
          label="Default Model"
          onChange={(value) => onChange({ defaultModel: value })}
          value={model}
        />
      )}
    </>
  );
}

export function TextField({
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

export function EffortSelect({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: ReasoningEffort) => void;
  value: ReasoningEffort;
}) {
  return (
    <SelectField
      label={label}
      onChange={(nextValue) => onChange(nextValue as ReasoningEffort)}
      options={REASONING_EFFORT_OPTIONS}
      value={value}
    />
  );
}

export function ContinuityRange({
  onChange,
  value,
}: {
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>Session Continuity</h3>
      </div>
      <p className="settings-description">
        When the remaining context window drops to or below this percentage,
        Harness AI can start a fresh session. Default: 30%.
      </p>
      <ManualIntegerField
        label="Remaining context threshold (%)"
        max={80}
        min={5}
        onChange={onChange}
        value={value}
      />
    </section>
  );
}

export function ProviderChecks({
  autoUpdate,
  onAutoUpdate,
  onThinkingDisplay,
  onThinkingEnabled,
  thinkingDisplay,
  thinkingEnabled,
}: {
  autoUpdate?: boolean;
  onAutoUpdate?: (enabled: boolean) => void;
  onThinkingDisplay?: (enabled: boolean) => void;
  onThinkingEnabled?: (enabled: boolean) => void;
  thinkingDisplay?: boolean;
  thinkingEnabled?: boolean;
}) {
  return (
    <>
      {typeof autoUpdate === "boolean" && onAutoUpdate ? (
        <CheckField
          checked={autoUpdate}
          label="Auto Update"
          onChange={onAutoUpdate}
        />
      ) : null}
      {typeof thinkingEnabled === "boolean" && onThinkingEnabled ? (
        <CheckField
          checked={thinkingEnabled}
          label="Thinking Enabled"
          onChange={onThinkingEnabled}
        />
      ) : null}
      {typeof thinkingDisplay === "boolean" && onThinkingDisplay ? (
        <CheckField
          checked={thinkingDisplay}
          label="Thinking Display Sync"
          onChange={onThinkingDisplay}
        />
      ) : null}
    </>
  );
}

function CheckField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-check">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

function ManualIntegerField({
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
    <label className="settings-field">
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
