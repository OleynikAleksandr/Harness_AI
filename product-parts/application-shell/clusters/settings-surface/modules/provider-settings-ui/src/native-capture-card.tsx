import { useEffect, useState } from "react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { SettingsCard } from "./settings-reference-controls.js";

interface CaptureProvider {
  readonly id: string;
  readonly models: readonly { readonly id: string; readonly label: string }[];
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
          setProviderId(first.id);
          setModel(first.models[0]?.id ?? "");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProvider = providers.find((entry) => entry.id === providerId);

  const onProviderChange = (nextProviderId: string) => {
    setProviderId(nextProviderId);
    const next = providers.find((entry) => entry.id === nextProviderId);
    setModel(next?.models[0]?.id ?? "");
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
          onChange={(event) => setModel(event.target.value)}
          value={model}
        >
          {(selectedProvider?.models ?? []).map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      <button
        className="settings-secondary"
        disabled={busy || !providerId}
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
