import type { ReactNode } from "react";
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
    <div className="settings-stack">
      <section className="settings-card">
        <div className="settings-card-header">
          <h3>{title}</h3>
        </div>
        <div className="settings-grid two">{children}</div>
      </section>
    </div>
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
    <label className="settings-field">
      <span>Default Model</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {resolvedOptions.map((option) => (
          <option key={option} value={option}>
            {option}
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
    <label className="settings-field">
      <span>{label}</span>
      <select
        onChange={(event) => onChange(event.target.value as ReasoningEffort)}
        value={value}
      >
        {REASONING_EFFORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
    <label className="settings-field">
      <span>Session Continuity: {value}%</span>
      <input
        max={80}
        min={5}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </label>
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
