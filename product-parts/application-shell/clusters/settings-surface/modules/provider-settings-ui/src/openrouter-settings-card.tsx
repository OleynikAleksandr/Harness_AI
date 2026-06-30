import { useEffect, useState } from "react";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  type OpenRouterEndpointLatencyResult,
  testOpenRouterEndpointLatency,
} from "./openrouter-endpoint-latency.js";
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
  const { t } = useBrowserLocalization();
  const update = (patch: Partial<OpenRouterSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <SettingsCard
      title={t("ui_labels", "settings.provider.openRouter", "OpenRouter")}
    >
      <p className="settings-description">
        {t(
          "ui_helper_text",
          "settings.provider.openRouter.description",
          "Uses OpenRouter chat completions with an exact model slug."
        )}
      </p>
      <SettingsTextField
        label={t("ui_labels", "settings.provider.apiKey", "API Key")}
        onChange={(apiKey) => update({ apiKey })}
        password
        placeholder="sk-or-..."
        value={settings.apiKey}
      />
      <SettingsTextField
        label={t("ui_labels", "settings.provider.baseUrl", "Base URL")}
        onChange={(baseUrl) => update({ baseUrl })}
        placeholder="https://openrouter.ai/api/v1"
        value={settings.baseUrl}
      />
      <OpenRouterModelEndpointPicker
        apiKey={settings.apiKey}
        baseUrl={settings.baseUrl}
        endpointTag={settings.endpointTag}
        label={t(
          "ui_labels",
          "settings.openRouter.modelSlugSearch",
          "Model slug search"
        )}
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
  const { t } = useBrowserLocalization();
  const [query, setQuery] = useState(value);
  const [models, setModels] = useState<OpenRouterModelSearchResult[]>([]);
  const translatedDescriptions = useTranslatedOpenRouterDescriptions(models);
  const [endpoints, setEndpoints] = useState<OpenRouterEndpointResult[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [latencyLoading, setLatencyLoading] = useState(false);
  const [latencyResults, setLatencyResults] = useState<
    OpenRouterEndpointLatencyResult[]
  >([]);

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
      setLatencyResults([]);
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
          setLatencyResults([]);
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
  const latencyByEndpoint = new Map(
    latencyResults.map((result) => [result.endpointTag, result])
  );
  const fastestResult = selectFastestResult(latencyResults);
  const hasLatencyTargets =
    endpoints.length > 0 ||
    Boolean(endpointTag && endpointTag !== DEFAULT_ENDPOINT_TAG);

  const testEndpoints = async () => {
    const endpointTags =
      endpoints.length > 0
        ? endpoints.map((endpoint) => endpoint.tag)
        : [endpointTag].filter((tag) => tag && tag !== DEFAULT_ENDPOINT_TAG);
    if (endpointTags.length === 0) {
      setError(
        t(
          "messages_for_the_user",
          "settings.openRouter.latency.noTargets",
          "No OpenRouter endpoints are available for this model."
        )
      );
      return;
    }
    setLatencyLoading(true);
    setError(null);
    const results = await Promise.all(
      endpointTags.map((endpointTag) =>
        testOpenRouterEndpointLatency({
          apiKey,
          baseUrl,
          endpointTag,
          model: value,
        })
      )
    );
    setLatencyResults(results);
    setLatencyLoading(false);
  };

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
      <div className="settings-list">
        {modelsLoading ? (
          <p className="settings-muted">
            {t(
              "messages_for_the_user",
              "settings.openRouter.models.searching",
              "Searching..."
            )}
          </p>
        ) : null}
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
            translatedDescription={translatedDescriptions[model.id]}
          />
        ))}
      </div>
      {value ? (
        <div className="settings-reference-stack tight">
          <p className="settings-description">
            {t("ui_labels", "settings.openRouter.endpoint", "Endpoint")}
          </p>
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
                {t(
                  "ui_labels",
                  "settings.openRouter.endpointAutomatic",
                  "OpenRouter - automatic"
                )}
              </span>
              <span className="settings-model-id">
                {t(
                  "ui_helper_text",
                  "settings.openRouter.defaultRouting.description",
                  "default routing"
                )}
              </span>
            </button>
            {endpointsLoading ? (
              <p className="settings-muted">
                {t(
                  "messages_for_the_user",
                  "settings.openRouter.endpoints.loading",
                  "Loading endpoints..."
                )}
              </p>
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
                <span className="settings-model-id">
                  {formatEndpointMetric(endpoint)}
                  {formatLatencyResult(latencyByEndpoint.get(endpoint.tag))}
                </span>
              </button>
            ))}
          </div>
          <div className="settings-latency-panel">
            <h4>
              {t(
                "ui_labels",
                "settings.openRouter.latency",
                "OpenRouter Endpoint Latency"
              )}
            </h4>
            <p>
              {t(
                "ui_helper_text",
                "settings.openRouter.latency.description",
                "Tests this selected model against concrete provider endpoints."
              )}
            </p>
            <div className="settings-latency-actions">
              <button
                className="settings-latency-button"
                disabled={
                  !(apiKey && value && hasLatencyTargets) || latencyLoading
                }
                onClick={testEndpoints}
                type="button"
              >
                {latencyLoading
                  ? t(
                      "messages_for_the_user",
                      "settings.openRouter.latency.testing",
                      "Testing..."
                    )
                  : t(
                      "ui_labels",
                      "settings.openRouter.latency.test",
                      "Test latency"
                    )}
              </button>
              {fastestResult ? (
                <button
                  className="settings-latency-secondary"
                  onClick={() =>
                    onChange({ endpointTag: fastestResult.endpointTag })
                  }
                  type="button"
                >
                  Use fastest: {fastestResult.endpointTag}
                </button>
              ) : null}
            </div>
            {apiKey ? null : (
              <p className="settings-latency-note">
                {t(
                  "messages_for_the_user",
                  "settings.openRouter.apiKeyRequired",
                  "OpenRouter API key is required."
                )}
              </p>
            )}
          </div>
        </div>
      ) : null}
      {error ? <p className="settings-note">{error}</p> : null}
    </div>
  );
}

function formatEndpointMetric(endpoint: OpenRouterEndpointResult): string {
  const parts: string[] = [];
  if (endpoint.uptimeLast30m !== null) {
    parts.push(`${endpoint.uptimeLast30m.toFixed(2)}% uptime`);
  }
  if (endpoint.latencyLast30m !== null) {
    parts.push(`${endpoint.latencyLast30m.toFixed(2)}s`);
  }
  if (endpoint.throughputLast30m !== null) {
    parts.push(`${Math.round(endpoint.throughputLast30m)} tps`);
  }
  return parts.length > 0 ? parts.join(" · ") : endpoint.name;
}

function formatLatencyResult(
  result: OpenRouterEndpointLatencyResult | undefined
): string {
  if (!result) {
    return "";
  }
  if (!result.ok) {
    return ` · live failed: ${result.error ?? "unknown error"}`;
  }
  return ` · live ${result.latencyMs ?? 0} ms`;
}

function selectFastestResult(
  results: readonly OpenRouterEndpointLatencyResult[]
): null | OpenRouterEndpointLatencyResult {
  return (
    results
      .filter((result) => result.ok && result.latencyMs !== null)
      .sort(
        (left, right) => (left.latencyMs ?? 0) - (right.latencyMs ?? 0)
      )[0] ?? null
  );
}

function OpenRouterModelRow({
  model,
  onSelect,
  selected,
  translatedDescription,
}: {
  model: OpenRouterModelSearchResult;
  onSelect: () => void;
  selected: boolean;
  translatedDescription?: string;
}) {
  const description = translatedDescription ?? model.description;
  return (
    <button
      aria-pressed={selected}
      className={selected ? "active settings-model-row" : "settings-model-row"}
      onClick={onSelect}
      type="button"
    >
      <span className="settings-model-title">{model.name}</span>
      <span className="settings-model-id">{model.id}</span>
      {description ? (
        <p className="settings-model-description">{description}</p>
      ) : null}
    </button>
  );
}

function useTranslatedOpenRouterDescriptions(
  models: readonly OpenRouterModelSearchResult[]
): Record<string, string> {
  const [translated, setTranslated] = useState<Record<string, string>>({});

  useEffect(() => {
    const descriptions = models.filter((model) => model.description.trim());
    if (descriptions.length === 0) {
      setTranslated({});
      return;
    }
    let cancelled = false;
    Promise.all(
      descriptions.map(async (model) => {
        const result = await window.harnessCore?.translateDynamicText({
          category: "reasoning",
          text: model.description,
        });
        return [
          model.id,
          result?.ok ? result.text : model.description,
        ] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) {
          setTranslated(Object.fromEntries(entries));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTranslated({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [models]);

  return translated;
}
