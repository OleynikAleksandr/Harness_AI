import { useEffect, useState } from "react";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import {
  loadOpenRouterModelEndpoints,
  type OpenRouterEndpointResult,
  type OpenRouterModelSearchResult,
  searchOpenRouterModels,
} from "./openrouter-model-search.js";
import {
  SettingsCard,
  SettingsTextField,
} from "./settings-reference-controls.js";

type OpenRouterSettings = HarnessSettings["providers"]["openRouter"];

const DEFAULT_ENDPOINT_TAG = "default";

export function OpenRouterSettingsCard({
  onChange,
  settings,
}: {
  onChange: (settings: OpenRouterSettings) => void;
  settings: OpenRouterSettings;
}) {
  const update = (patch: Partial<OpenRouterSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <SettingsCard title="OpenRouter">
      <p className="settings-description">
        Uses OpenRouter chat completions with an exact model slug.
      </p>
      <SettingsTextField
        label="API Key"
        onChange={(apiKey) => update({ apiKey })}
        password
        placeholder="sk-or-..."
        value={settings.apiKey}
      />
      <SettingsTextField
        label="Base URL"
        onChange={(baseUrl) => update({ baseUrl })}
        placeholder="https://openrouter.ai/api/v1"
        value={settings.baseUrl}
      />
      <OpenRouterModelEndpointPicker
        apiKey={settings.apiKey}
        baseUrl={settings.baseUrl}
        endpointTag={settings.endpointTag}
        label="Model slug search"
        onChange={(patch) =>
          update({
            defaultModel: patch.model ?? settings.defaultModel,
            endpointTag: patch.endpointTag ?? settings.endpointTag,
          })
        }
        value={settings.defaultModel}
      />
    </SettingsCard>
  );
}

export function OpenRouterModelEndpointPicker({
  apiKey,
  baseUrl,
  endpointTag,
  label,
  onChange,
  value,
}: {
  apiKey: string;
  baseUrl: string;
  endpointTag: string;
  label: string;
  onChange: (patch: { endpointTag?: string; model?: string }) => void;
  value: string;
}) {
  const [query, setQuery] = useState(value);
  const [models, setModels] = useState<OpenRouterModelSearchResult[]>([]);
  const [endpoints, setEndpoints] = useState<OpenRouterEndpointResult[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    setError(null);
    searchOpenRouterModels({
      apiKey,
      baseUrl,
      query: trimmedQuery,
    })
      .then((results) => {
        if (!cancelled) {
          setModels(results);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
          setModels([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModelsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, baseUrl, query]);

  useEffect(() => {
    if (!value.includes("/")) {
      setEndpoints([]);
      return;
    }
    let cancelled = false;
    setEndpointsLoading(true);
    setError(null);
    loadOpenRouterModelEndpoints({
      apiKey,
      baseUrl,
      modelId: value,
    })
      .then((results) => {
        if (!cancelled) {
          setEndpoints(results);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
          setEndpoints([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEndpointsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, baseUrl, value]);

  const usesAutomaticEndpoint =
    !endpointTag || endpointTag === DEFAULT_ENDPOINT_TAG;

  return (
    <div className="settings-reference-stack tight">
      <label className="settings-field">
        <span>{label}</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="google/gemini-3.1-flash-lite"
          type="text"
          value={query}
        />
      </label>
      {value ? (
        <button
          aria-pressed="true"
          className="active settings-model-row"
          onClick={() => undefined}
          type="button"
        >
          <span className="settings-model-title">Selected model</span>
          <span className="settings-model-id">{value}</span>
        </button>
      ) : null}
      <div className="settings-list">
        {modelsLoading ? <p className="settings-muted">Searching...</p> : null}
        {models.map((model) => (
          <OpenRouterModelRow
            key={model.id}
            model={model}
            onSelect={() =>
              onChange({
                endpointTag: DEFAULT_ENDPOINT_TAG,
                model: model.id,
              })
            }
            selected={model.id === value}
          />
        ))}
      </div>
      {value ? (
        <div className="settings-reference-stack tight">
          <p className="settings-description">Endpoint</p>
          <div className="settings-list">
            <button
              aria-pressed={usesAutomaticEndpoint}
              className={
                usesAutomaticEndpoint
                  ? "active settings-model-row"
                  : "settings-model-row"
              }
              onClick={() => onChange({ endpointTag: DEFAULT_ENDPOINT_TAG })}
              type="button"
            >
              <span className="settings-model-title">
                OpenRouter - automatic
              </span>
              <span className="settings-model-id">default routing</span>
            </button>
            {endpointsLoading ? (
              <p className="settings-muted">Loading endpoints...</p>
            ) : null}
            {endpoints.map((endpoint) => (
              <button
                aria-pressed={endpoint.tag === endpointTag}
                className={
                  endpoint.tag === endpointTag
                    ? "active settings-model-row"
                    : "settings-model-row"
                }
                key={endpoint.tag}
                onClick={() => onChange({ endpointTag: endpoint.tag })}
                type="button"
              >
                <span className="settings-model-title">{endpoint.label}</span>
                <span className="settings-model-id">{endpoint.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p className="settings-note">{error}</p> : null}
    </div>
  );
}

function OpenRouterModelRow({
  model,
  onSelect,
  selected,
}: {
  model: OpenRouterModelSearchResult;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={selected ? "active settings-model-row" : "settings-model-row"}
      onClick={onSelect}
      type="button"
    >
      <span className="settings-model-title">{model.name}</span>
      <span className="settings-model-id">{model.id}</span>
      {model.description ? (
        <p className="settings-model-description">{model.description}</p>
      ) : null}
    </button>
  );
}
