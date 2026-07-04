import { useEffect, useState } from "react";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import type { ProviderVersionsSnapshot } from "./provider-version-controls.js";
import { SETTINGS_TABS, type SettingsTabId } from "./settings-model-options.js";
import { SettingsTabContent } from "./settings-tab-content.js";
import "./settings-surface.css";

interface ProviderSettingsUiFacadeProps {
  isOpen: boolean;
  onClose: () => void;
  onLocalizationRuntimeRefresh: () => Promise<void>;
}

export function ProviderSettingsUiFacade({
  isOpen,
  onClose,
  onLocalizationRuntimeRefresh,
}: ProviderSettingsUiFacadeProps) {
  const { t } = useBrowserLocalization();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("claude");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [coreRestartBusy, setCoreRestartBusy] = useState(false);
  const [coreRestartStatus, setCoreRestartStatus] = useState("");
  const [rebuildTranslationsBusy, setRebuildTranslationsBusy] = useState(false);
  const [rebuildTranslationsStatus, setRebuildTranslationsStatus] =
    useState("");
  const [settings, setSettings] = useState<HarnessSettings | null>(null);
  const [status, setStatus] = useState("Settings are ready.");
  const [versionError, setVersionError] = useState<null | string>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [localizationRefreshBusy, setLocalizationRefreshBusy] = useState(false);
  const [versions, setVersions] = useState<null | ProviderVersionsSnapshot>(
    null
  );
  const [versionUpdatingTargets, setVersionUpdatingTargets] = useState<
    string[]
  >([]);
  const [localModels, setLocalModels] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let cancelled = false;
    setBusy(true);
    onLocalizationRuntimeRefresh().catch(() => undefined);
    window.harnessCore
      ?.getSettings()
      .then((snapshot) => {
        if (!cancelled) {
          setSettings(snapshot);
          setDirty(false);
          setStatus("Settings loaded.");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus(
            error instanceof Error ? error.message : "Settings load failed."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, onLocalizationRuntimeRefresh]);

  useEffect(() => {
    if (!(isOpen && window.harnessCore)) {
      return;
    }
    let cancelled = false;
    window.harnessCore.getLocalModels().then((result) => {
      if (cancelled) {
        return;
      }
      setLocalModels(result.ok ? result.models : []);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!window.harnessCore) {
      setVersionError("Version bridge is unavailable.");
      return;
    }
    let cancelled = false;
    setVersionLoading(true);
    setVersionError(null);
    window.harnessCore
      .getProviderVersions()
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.ok) {
          setVersions(result.versions);
        } else {
          setVersionError(result.error);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setVersionError(
            error instanceof Error ? error.message : "Version scan failed."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setVersionLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const update = (mutator: (next: HarnessSettings) => void) => {
    setSettings((current) => {
      if (!current) {
        return current;
      }
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
    setDirty(true);
    setStatus("Unsaved changes.");
  };

  const save = async () => {
    if (!(settings && window.harnessCore)) {
      return null;
    }
    setBusy(true);
    setLocalizationRefreshBusy(true);
    try {
      const result = await window.harnessCore.saveSettings({ settings });
      if (result.ok) {
        setSettings(result.settings);
        setDirty(false);
        setStatus("Settings saved. Updating localization...");
        if (await refreshLocalizationRuntimeAfterSave()) {
          setStatus("Settings saved.");
        }
        return result.settings;
      }
      setStatus(result.error);
      return null;
    } catch (error) {
      setStatus(toErrorMessage(error, "Settings save failed."));
      return null;
    } finally {
      setLocalizationRefreshBusy(false);
      setBusy(false);
    }
  };

  const refreshLocalizationRuntimeAfterSave = async () => {
    try {
      await onLocalizationRuntimeRefresh();
      return true;
    } catch (error) {
      setStatus(toErrorMessage(error, "Localization refresh failed."));
      return false;
    }
  };

  const restartApp = async () => {
    if (!(settings && window.harnessCore && window.harnessShell)) {
      setCoreRestartStatus("App restart bridge is unavailable.");
      return;
    }
    setCoreRestartBusy(true);
    setCoreRestartStatus("Restart requested. Saving settings...");
    try {
      const savedSettings = dirty ? await save() : settings;
      if (!savedSettings) {
        setCoreRestartStatus("App restart skipped: settings save failed.");
        return;
      }
      const result = await window.harnessShell.restartApp();
      if (result.ok) {
        setCoreRestartStatus("App restart requested. Relaunching...");
        return;
      }
      setCoreRestartStatus(result.error);
    } catch (error) {
      setCoreRestartStatus(toErrorMessage(error, "App restart failed."));
    } finally {
      setCoreRestartBusy(false);
    }
  };

  const reset = async () => {
    if (!window.harnessCore) {
      return;
    }
    setBusy(true);
    const result = await window.harnessCore.resetWorkspaceSettings();
    if (result.ok) {
      setSettings(result.settings);
      setDirty(false);
      await onLocalizationRuntimeRefresh();
      setStatus("Workspace settings reset.");
    } else {
      setStatus(result.error);
    }
    setBusy(false);
  };

  const openGlossary = async () => {
    if (!window.harnessCore) {
      return;
    }
    const result = await window.harnessCore.ensureGlossaryFile();
    if (result.ok) {
      window.open(
        `vscode://file/${result.filePath}:1:1`,
        "_blank",
        "noreferrer"
      );
      return;
    }
    setStatus(result.error);
  };

  const rebuildTranslations = async () => {
    if (!window.harnessCore) {
      return;
    }
    setRebuildTranslationsBusy(true);
    setRebuildTranslationsStatus(
      t(
        "messages_for_the_user",
        "settings.localization.rebuilding",
        "Rebuilding translations..."
      )
    );
    try {
      const result = await window.harnessCore.rebuildLocalization();
      if (result.ok) {
        await onLocalizationRuntimeRefresh();
        setRebuildTranslationsStatus(
          t(
            "messages_for_the_user",
            "settings.localization.rebuilt",
            "Translations rebuilt."
          )
        );
        return;
      }
      setRebuildTranslationsStatus(result.error);
    } catch (error) {
      setRebuildTranslationsStatus(
        toErrorMessage(error, "Translations rebuild failed.")
      );
    } finally {
      setRebuildTranslationsBusy(false);
    }
  };

  const updateProvider = async (
    provider: "claude" | "codex",
    target: "cli" | "sdk"
  ) => {
    if (!window.harnessCore) {
      return;
    }
    const key = `${provider}:${target}`;
    setVersionUpdatingTargets((current) => [...current, key]);
    setVersionError(null);
    const result = await window.harnessCore.updateProviderVersion({
      provider,
      target,
    });
    if (result.ok) {
      setVersions(result.versions);
      setStatus("Provider version updated.");
    } else {
      setVersionError(result.error);
    }
    setVersionUpdatingTargets((current) =>
      current.filter((targetKey) => targetKey !== key)
    );
  };

  return (
    <div className="settings-backdrop" role="presentation">
      <div aria-modal="true" className="settings-dialog" role="dialog">
        <header className="settings-header">
          <div className="settings-title">
            <h2>{t("ui_labels", "settings.title", "Settings")}</h2>
          </div>
          <button
            aria-label={t(
              "ui_labels",
              "settings.closeSettings",
              "Close Settings"
            )}
            className="settings-icon-button"
            onClick={onClose}
            title={t("ui_labels", "settings.closeSettings", "Close Settings")}
            type="button"
          >
            ×
          </button>
        </header>
        <nav
          aria-label={t("ui_labels", "settings.sections", "Settings sections")}
          className="settings-tabs"
        >
          {SETTINGS_TABS.map((tab) => (
            <button
              className={
                activeTab === tab.id ? "active settings-tab" : "settings-tab"
              }
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {t("ui_labels", `settings.tab.${tab.id}`, tab.label)}
            </button>
          ))}
        </nav>
        <main className="settings-body">
          <div className="settings-content">
            {settings ? (
              <SettingsTabContent
                activeTab={activeTab}
                coreRestartBusy={coreRestartBusy}
                coreRestartStatus={
                  coreRestartStatus ||
                  t(
                    "ui_helper_text",
                    "settings.coreControls.restartStatus.ready",
                    "App restart status will appear here."
                  )
                }
                localModels={localModels}
                onOpenGlossary={openGlossary}
                onRebuildTranslations={rebuildTranslations}
                onRestartCore={restartApp}
                onUpdateProvider={updateProvider}
                rebuildTranslationsBusy={rebuildTranslationsBusy}
                rebuildTranslationsStatus={rebuildTranslationsStatus}
                settings={settings}
                update={update}
                versionError={versionError}
                versionLoading={versionLoading}
                versions={versions}
                versionUpdatingTargets={versionUpdatingTargets}
              />
            ) : (
              <div className="settings-card">
                {t(
                  "messages_for_the_user",
                  "settings.loading",
                  "Loading settings..."
                )}
              </div>
            )}
          </div>
        </main>
        <footer className="settings-footer">
          <button
            className="settings-secondary"
            disabled={busy}
            onClick={reset}
            title={status}
            type="button"
          >
            {busy
              ? t("messages_for_the_user", "settings.resetting", "Resetting...")
              : t("ui_labels", "settings.resetDefaults", "Reset to Defaults")}
          </button>
          <div className="settings-actions">
            <button
              className="settings-secondary"
              onClick={onClose}
              type="button"
            >
              {t("ui_labels", "common.close", "Close")}
            </button>
            <button
              className="settings-primary"
              disabled={busy || localizationRefreshBusy || !dirty}
              onClick={save}
              type="button"
            >
              {busy
                ? t("messages_for_the_user", "settings.saving", "Saving...")
                : t("ui_labels", "settings.saveChanges", "Save Changes")}
            </button>
          </div>
        </footer>
        {localizationRefreshBusy ? (
          <div className="settings-localization-blocker" role="status">
            <div className="settings-localization-card">
              <span aria-hidden="true" className="settings-spinner" />
              <div>
                <p className="settings-localization-title">
                  {t(
                    "messages_for_the_user",
                    "settings.localization.refreshing.title",
                    "Updating localization"
                  )}
                </p>
                <p className="settings-localization-description">
                  {t(
                    "messages_for_the_user",
                    "settings.localization.refreshing.description",
                    "Harness AI is saving translated interface resources. Settings will be available again when this finishes."
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
