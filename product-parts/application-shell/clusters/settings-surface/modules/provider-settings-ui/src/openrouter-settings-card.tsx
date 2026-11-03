import { useEffect, useState } from "react";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  type OpenRouterEndpointLatencyResult,
  testOpenRouterEndpointLatency,
} from "./openrouter-endpoint-latency.js";
import {
  formatEndpointMetric,
  formatLatencyResult,
  OpenRouterUnavailableEndpointRow,
  resolveUnavailableEndpointTag,
  selectFastestResult,
} from "./openrouter-endpoint-rows.js";
import { OpenRouterModelRow } from "./openrouter-model-row.js";
import {
  loadOpenRouterModelEndpoints,
  type OpenRouterEndpointResult,
  type OpenRouterModelSearchResult,
  searchOpenRouterModels,
} from "./openrouter-model-search.js";
import { useTranslatedModelDescriptions } from "./provider-model-catalog-hooks.js";
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
  // The nonce lets the refresh control re-run the same slug search: bumping it
  // changes the request identity without changing the query text.
  const [searchRequest, setSearchRequest] = useState(() => ({
    nonce: 0,
    text: value,
  }));
  const [models, setModels] = useState<OpenRouterModelSearchResult[]>([]);
  // Presentation-only state: once a model is picked (or the picker opens with
  // a stored model), the other match cards are hidden until the user types a
  // new query or presses the refresh control in the search field.
  const [resultsCollapsed, setResultsCollapsed] = useState(() =>
    Boolean(value.trim())
  );
  const translatedDescriptions = useTranslatedModelDescriptions(models);
  const [endpoints, setEndpoints] = useState<OpenRouterEndpointResult[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [latencyLoading, setLatencyLoading] = useState(false);
  const [latencyResults, setLatencyResults] = useState<
    OpenRouterEndpointLatencyResult[]
  >([]);

  useEffect(() => {
    setSearchRequest((previous) =>
      previous.text === value
        ? previous
        : { nonce: previous.nonce, text: value }
    );
  }, [value]);

  useEffect(() => {
    const trimmedQuery = searchRequest.text.trim();
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
  }, [apiKey, baseUrl, searchRequest]);

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
  const unavailableEndpointTag = resolveUnavailableEndpointTag({
    automatic: usesAutomaticEndpoint,
    endpointTag,
    endpoints,
    failed: Boolean(error),
    loading: endpointsLoading,
  });
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

  const refreshLabel = t(
    "ui_labels",
    "settings.openRouter.searchRefresh",
    "Refresh model matches"
  );
  const visibleModels = resultsCollapsed
    ? models.filter((model) => model.id === value)
    : models;

  return (
    <div className="settings-reference-stack tight">
      <label className="settings-field">
        <span>{label}</span>
        <div className="settings-model-search">
          <input
            onChange={(event) => {
              const text = event.target.value;
              setSearchRequest((previous) => ({
                nonce: previous.nonce,
                text,
              }));
              setResultsCollapsed(false);
            }}
            placeholder="google/gemini-3.1-flash-lite"
            type="text"
            value={searchRequest.text}
          />
          <button
            aria-label={refreshLabel}
            className="settings-model-search-refresh"
            onClick={() => {
              setResultsCollapsed(false);
              setSearchRequest((previous) => ({
                nonce: previous.nonce + 1,
                text: previous.text,
              }));
            }}
            title={refreshLabel}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="14"
              viewBox="0 0 16 16"
              width="14"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.6"
              />
              <path
                d="M13.7 1.8v2.6h-2.6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </button>
        </div>
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
        {visibleModels.map((model) => (
          <OpenRouterModelRow
            key={model.id}
            model={model}
            onSelect={() => {
              setResultsCollapsed(true);
              onChange({
                endpointTag: DEFAULT_ENDPOINT_TAG,
                model: model.id,
              });
            }}
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
            <OpenRouterUnavailableEndpointRow
              endpointTag={unavailableEndpointTag}
            />
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
