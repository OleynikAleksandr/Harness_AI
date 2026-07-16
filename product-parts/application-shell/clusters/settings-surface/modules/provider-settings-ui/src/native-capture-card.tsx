import { useEffect, useState } from "react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { SettingsCard } from "./settings-reference-controls.js";

interface CaptureProvider {
  readonly id: string;
  readonly models: readonly CaptureModel[];
}

interface CaptureModel {
  readonly defaultReasoningEffort: string | null;
  readonly id: string;
  readonly label: string;
  readonly reasoningEfforts: readonly {
    readonly id: string;
    readonly label: string;
  }[];
}

interface CaptureResult {
  readonly error: string | null;
  readonly jsonlPath: string | null;
  readonly markdownPath: string | null;
  readonly ok: boolean;
}

// Native Request Capture card: records a provider's vendor-default request
// locally (record-only). The renderer only submits the Core capture command
// and displays the Core-returned artifact paths; capture truth is Core-owned.
export function NativeCaptureCard() {
  const { t } = useBrowserLocalization();
  const [providers, setProviders] = useState<readonly CaptureProvider[]>([]);
  const [providerId, setProviderId] = useState("");
  const [model, setModel] = useState("");
  const [reasoningEffort, setReasoningEffort] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<CaptureResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.harnessCore
      ?.listCapturableModels()
      .then((response) => {
        if (cancelled || !response.ok) {
          return;
        }
        setProviders(response.providers);
        const first = response.providers[0];
        if (first) {
          const firstModel = first.models[0];
          setProviderId(first.id);
          setModel(firstModel?.id ?? "");
          setReasoningEffort(firstModel?.defaultReasoningEffort ?? "");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProvider = providers.find((entry) => entry.id === providerId);
  const selectedModel = selectedProvider?.models.find(
    (entry) => entry.id === model
  );
  const modelRequiresReasoning = Boolean(
    selectedModel && selectedModel.reasoningEfforts.length > 0
  );

  const selectModel = (
    provider: CaptureProvider | undefined,
    modelId?: string
  ) => {
    const nextModel =
      provider?.models.find((entry) => entry.id === modelId) ??
      provider?.models[0];
    setModel(nextModel?.id ?? "");
    setReasoningEffort(nextModel?.defaultReasoningEffort ?? "");
    setResult(null);
  };

  const onProviderChange = (nextProviderId: string) => {
    setProviderId(nextProviderId);
    selectModel(providers.find((entry) => entry.id === nextProviderId));
  };

  const runCapture = async () => {
    if (!(window.harnessCore && providerId)) {
      return;
    }
    setBusy(true);
    setResult(null);
    setStatus(
      t(
        "messages_for_the_user",
        "settings.nativeCapture.capturing",
        "Capturing..."
      )
    );
    try {
      const captureResult = await window.harnessCore.captureNativeRequest({
        model: model || undefined,
        providerId,
        reasoningEffort: reasoningEffort || undefined,
      });
      setResult(captureResult);
      setStatus(
        captureResult.ok
          ? t(
              "messages_for_the_user",
              "settings.nativeCapture.done",
              "Capture complete. Artifacts written below."
            )
          : t(
              "messages_for_the_user",
              "settings.nativeCapture.failed",
              "Capture failed: {error}"
            ).replace("{error}", captureResult.error ?? "unknown")
      );
    } catch {
      setStatus(
        t(
          "messages_for_the_user",
          "core.bridge.unavailable",
          "Core bridge is unavailable."
        )
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard
      title={t(
        "ui_labels",
        "settings.nativeCapture.title",
        "Native Request Capture"
      )}
    >
      <p className="settings-description">
        {t(
          "ui_helper_text",
          "settings.nativeCapture.description",
          "Capture a provider's native request locally for reference. Never sends upstream."
        )}
      </p>
      <label className="settings-field">
        <span>
          {t("ui_labels", "settings.nativeCapture.provider", "Provider")}
        </span>
        <select
          onChange={(event) => onProviderChange(event.target.value)}
          value={providerId}
        >
          {providers.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.id}
            </option>
          ))}
        </select>
      </label>
      <label className="settings-field">
        <span>{t("ui_labels", "settings.nativeCapture.model", "Model")}</span>
        <select
          onChange={(event) =>
            selectModel(selectedProvider, event.target.value)
          }
          value={model}
        >
          {(selectedProvider?.models ?? []).map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      {modelRequiresReasoning ? (
        <label className="settings-field">
          <span>
            {t("ui_labels", "settings.nativeCapture.reasoning", "Reasoning")}
          </span>
          <select
            onChange={(event) => setReasoningEffort(event.target.value)}
            value={reasoningEffort}
          >
            {(selectedModel?.reasoningEfforts ?? []).map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        className="settings-secondary"
        disabled={
          busy ||
          !providerId ||
          !model ||
          (modelRequiresReasoning && !reasoningEffort)
        }
        onClick={() => {
          runCapture().catch(() => setBusy(false));
        }}
        type="button"
      >
        {t("ui_labels", "settings.nativeCapture.capture", "Capture")}
      </button>
      {status ? <p className="settings-version-status">{status}</p> : null}
      {result?.markdownPath ? (
        <p className="settings-version-text">
          {t(
            "ui_labels",
            "settings.nativeCapture.markdownPath",
            "Markdown artifact"
          )}
          : {result.markdownPath}
        </p>
      ) : null}
      {result?.jsonlPath ? (
        <p className="settings-version-text">
          {t("ui_labels", "settings.nativeCapture.jsonlPath", "JSONL artifact")}
          : {result.jsonlPath}
        </p>
      ) : null}
    </SettingsCard>
  );
}
