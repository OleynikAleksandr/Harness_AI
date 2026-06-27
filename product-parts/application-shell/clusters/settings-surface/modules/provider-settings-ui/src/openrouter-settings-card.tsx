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

export function OpenRouterSettingsCard({
  onChange,
  settings,
}: {
  onChange: (settings: OpenRouterSettings) => void;
  settings: OpenRouterSettings;
}) {
  const [query, setQuery] = useState(settings.defaultModel);
  const [models, setModels] = useState<OpenRouterModelSearchResult[]>([]);
  const [endpoints, setEndpoints] = useState<OpenRouterEndpointResult[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    setQuery(settings.defaultModel);
  }, [settings.defaultModel]);

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
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
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
  }, [settings.apiKey, settings.baseUrl, query]);

  useEffect(() => {
    if (!settings.defaultModel.includes("/")) {
      setEndpoints([]);
      return;
    }
    let cancelled = false;
    setEndpointsLoading(true);
    setError(null);
    loadOpenRouterModelEndpoints({
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      modelId: settings.defaultModel,
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
  }, [settings.apiKey, settings.baseUrl, settings.defaultModel]);

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
      <label className="settings-field">
        <span>Model slug search</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="google/gemini-3.1-flash-lite"
          type="text"
          value={query}
        />
      </label>
      {settings.defaultModel ? (
        <button
          aria-pressed="true"
          className="active settings-model-row"
          onClick={() => undefined}
          type="button"
        >
          <span className="settings-model-title">Selected model</span>
          <span className="settings-model-id">{settings.defaultModel}</span>
        </button>
      ) : null}
      <div className="settings-list">
        {modelsLoading ? <p className="settings-muted">Searching...</p> : null}
        {models.map((model) => (
          <OpenRouterModelRow
            key={model.id}
            model={model}
            onSelect={() => update({ defaultModel: model.id, endpointTag: "" })}
            selected={model.id === settings.defaultModel}
          />
        ))}
      </div>
      {settings.defaultModel ? (
        <div className="settings-reference-stack tight">
          <p className="settings-description">Endpoint</p>
          <div className="settings-list">
            <button
              aria-pressed={!settings.endpointTag}
              className={
                settings.endpointTag
                  ? "settings-model-row"
                  : "active settings-model-row"
              }
              onClick={() => update({ endpointTag: "" })}
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
                aria-pressed={endpoint.tag === settings.endpointTag}
                className={
                  endpoint.tag === settings.endpointTag
                    ? "active settings-model-row"
                    : "settings-model-row"
                }
                key={endpoint.tag}
                onClick={() => update({ endpointTag: endpoint.tag })}
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
    </SettingsCard>
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
