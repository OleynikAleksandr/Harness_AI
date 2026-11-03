import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import type { OpenRouterEndpointLatencyResult } from "./openrouter-endpoint-latency.js";
import type { OpenRouterEndpointResult } from "./openrouter-model-search.js";

// Endpoint rows and presentation helpers for the OpenRouter endpoint picker,
// split from `openrouter-settings-card.tsx` for the 500-line implementation
// cap.

export function formatEndpointMetric(
  endpoint: OpenRouterEndpointResult
): string {
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

export function formatLatencyResult(
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

export function selectFastestResult(
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

// A stored endpoint tag can vanish from OpenRouter after it was picked; once
// the live list has loaded without it, the picker shows the tag as an
// unavailable selected row instead of leaving no endpoint selected.
export function resolveUnavailableEndpointTag(options: {
  readonly automatic: boolean;
  readonly endpointTag: string;
  readonly endpoints: readonly OpenRouterEndpointResult[];
  readonly failed: boolean;
  readonly loading: boolean;
}): null | string {
  const settled = !(options.automatic || options.loading || options.failed);
  return settled &&
    options.endpoints.length > 0 &&
    !options.endpoints.some((endpoint) => endpoint.tag === options.endpointTag)
    ? options.endpointTag
    : null;
}

export function OpenRouterUnavailableEndpointRow({
  endpointTag,
}: {
  endpointTag: null | string;
}) {
  const { t } = useBrowserLocalization();
  if (!endpointTag) {
    return null;
  }
  return (
    <button
      aria-pressed
      className="active settings-model-row"
      disabled
      type="button"
    >
      <span className="settings-model-title">
        {endpointTag} (
        {t(
          "ui_labels",
          "settings.openRouter.endpointUnavailable",
          "unavailable"
        )}
        )
      </span>
      <span className="settings-model-id">
        {t(
          "ui_helper_text",
          "settings.openRouter.endpointUnavailable.description",
          "OpenRouter no longer offers this endpoint for this model. Choose another endpoint."
        )}
      </span>
    </button>
  );
}
