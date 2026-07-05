// Local Models list on the structured catalog: every model row shows its
// max/loaded context from the LM Studio management channel, and the selected
// model carries a context control — the Harness counterpart of the LM Studio
// load slider (an actual remote reload through set-local-model-context, not a
// bookkeeping override). Plain servers (Ollama/llama.cpp ids only) show bare
// rows without the control.

import { useEffect, useState } from "react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  SettingsCard,
  SettingsTextField,
} from "./settings-reference-controls.js";

// Renderer-side read-model of the Core `get-local-models` entries. The shape
// mirrors the Core management channel; the renderer never imports provider
// implementation modules (Application Shell boundary) and never derives
// these facts itself — they arrive normalized over the RPC.
export interface LocalModelEntry {
  readonly displayName: string;
  readonly key: string;
  readonly loadedContextLength: number | null;
  readonly loadedInstanceId: string | null;
  readonly maxContextLength: number | null;
  readonly supportsTools: boolean | null;
}

const CONTEXT_DIGITS_PATTERN = /^\d+$/u;

interface LocalModelsSettingsCardProps {
  applyBusy: boolean;
  defaultModel: string;
  entries: readonly LocalModelEntry[];
  onApplyContext: (model: string, contextLength: number) => void;
  onDefaultModelChange: (modelId: string) => void;
}

export function LocalModelsSettingsCard({
  applyBusy,
  defaultModel,
  entries,
  onApplyContext,
  onDefaultModelChange,
}: LocalModelsSettingsCardProps) {
  const { t } = useBrowserLocalization();
  const selectedKey = entries.some((entry) => entry.key === defaultModel)
    ? defaultModel
    : entries[0]?.key;
  const selected = entries.find((entry) => entry.key === selectedKey);
  const [contextInput, setContextInput] = useState("");
  const metaLabels = {
    loadedLabel: t(
      "ui_labels",
      "settings.provider.localModelsClient.loadedContext",
      "loaded"
    ),
    maxLabel: t(
      "ui_labels",
      "settings.provider.localModelsClient.maxContext",
      "max"
    ),
    toolsLabel: t(
      "ui_labels",
      "settings.provider.localModelsClient.tools",
      "tools"
    ),
  };

  // The control follows the selection: prefill with the loaded window.
  useEffect(() => {
    setContextInput(
      selected?.loadedContextLength ? String(selected.loadedContextLength) : ""
    );
  }, [selected?.loadedContextLength]);

  return (
    <SettingsCard
      title={t("ui_labels", "settings.provider.localModels", "Local Models")}
    >
      <div className="settings-list">
        <p className="settings-description">
          {t(
            "ui_helper_text",
            "settings.provider.localModels.description",
            "Select the default local model used for new Local Models sessions."
          )}
        </p>
        {entries.length > 0 ? (
          entries.map((entry) => (
            <button
              aria-pressed={entry.key === selectedKey}
              className={
                entry.key === selectedKey
                  ? "active settings-model-row"
                  : "settings-model-row"
              }
              key={entry.key}
              onClick={() => onDefaultModelChange(entry.key)}
              type="button"
            >
              <span className="settings-model-title">{entry.displayName}</span>
              <span className="settings-model-description">
                {formatEntryMeta(entry, metaLabels)}
              </span>
            </button>
          ))
        ) : (
          <p className="settings-muted">
            {t(
              "messages_for_the_user",
              "settings.provider.localModels.empty",
              "No local models are currently visible to Core. Start the local server and load a model."
            )}
          </p>
        )}
      </div>
      {selected && selected.maxContextLength !== null ? (
        <div className="settings-reference-stack tight">
          <SettingsTextField
            label={t(
              "ui_labels",
              "settings.provider.localModelsClient.contextLength",
              "Context Length"
            )}
            onChange={setContextInput}
            placeholder={String(selected.maxContextLength)}
            value={contextInput}
          />
          <p className="settings-note">
            {t(
              "ui_helper_text",
              "settings.provider.localModelsClient.contextLength.description",
              "Per-model context window in tokens, applied by reloading the model in LM Studio. 0 or empty keeps the server default."
            )}
          </p>
          <button
            className="settings-latency-button"
            disabled={applyBusy || !isValidContextInput(contextInput)}
            onClick={() =>
              onApplyContext(selected.key, parseContextInput(contextInput))
            }
            type="button"
          >
            {applyBusy
              ? t(
                  "messages_for_the_user",
                  "settings.provider.localModelsClient.contextLength.applying",
                  "Reloading..."
                )
              : t(
                  "ui_labels",
                  "settings.provider.localModelsClient.contextLength.apply",
                  "Apply Context"
                )}
          </button>
        </div>
      ) : null}
    </SettingsCard>
  );
}

function isValidContextInput(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length === 0 || CONTEXT_DIGITS_PATTERN.test(trimmed);
}

function parseContextInput(value: string): number {
  const trimmed = value.trim();
  if (!CONTEXT_DIGITS_PATTERN.test(trimmed)) {
    return 0;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function formatEntryMeta(
  entry: LocalModelEntry,
  labels: { loadedLabel: string; maxLabel: string; toolsLabel: string }
): string {
  const parts: string[] = [];
  if (entry.maxContextLength !== null) {
    parts.push(`${labels.maxLabel} ${entry.maxContextLength.toLocaleString()}`);
  }
  if (entry.loadedContextLength !== null) {
    parts.push(
      `${labels.loadedLabel} ${entry.loadedContextLength.toLocaleString()}`
    );
  }
  if (entry.supportsTools === true) {
    parts.push(labels.toolsLabel);
  }
  return parts.length > 0 ? parts.join(" · ") : entry.key;
}
