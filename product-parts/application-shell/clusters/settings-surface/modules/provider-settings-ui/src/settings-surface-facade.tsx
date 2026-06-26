import { useEffect, useState } from "react";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import type { ProviderVersionsSnapshot } from "./provider-version-controls.js";
import { SETTINGS_TABS, type SettingsTabId } from "./settings-model-options.js";
import { SettingsTabContent } from "./settings-tab-content.js";
import "./settings-surface.css";

interface ProviderSettingsUiFacadeProps {
  isOpen: boolean;
  onClose: () => void;
  workspacePath: string;
}

export function ProviderSettingsUiFacade({
  isOpen,
  onClose,
  workspacePath,
}: ProviderSettingsUiFacadeProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("claude");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [coreRestartBusy, setCoreRestartBusy] = useState(false);
  const [coreRestartStatus, setCoreRestartStatus] = useState(
    "Core restart status will appear here."
  );
  const [settings, setSettings] = useState<HarnessSettings | null>(null);
  const [status, setStatus] = useState("Settings are ready.");
  const [versionError, setVersionError] = useState<null | string>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [versions, setVersions] = useState<null | ProviderVersionsSnapshot>(
    null
  );
  const [versionUpdatingTargets, setVersionUpdatingTargets] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let cancelled = false;
    setBusy(true);
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
    const result = await window.harnessCore.saveSettings({ settings });
    if (result.ok) {
      setSettings(result.settings);
      setDirty(false);
      setStatus("Settings saved.");
      setBusy(false);
      return result.settings;
    }
    setStatus(result.error);
    setBusy(false);
    return null;
  };

  const restartCore = async () => {
    if (!(settings && window.harnessCore)) {
      return;
    }
    setCoreRestartBusy(true);
    setCoreRestartStatus("Restart requested. Refreshing Core adapters...");
    const savedSettings = dirty ? await save() : settings;
    if (!savedSettings) {
      setCoreRestartStatus("Core restart skipped: settings save failed.");
      setCoreRestartBusy(false);
      return;
    }
    const result = await window.harnessCore.restartCore();
    if (result.ok) {
      setSettings(result.settings);
      setCoreRestartStatus("Core restart completed.");
      setStatus("Core adapters refreshed.");
    } else {
      setCoreRestartStatus(result.error);
    }
    setCoreRestartBusy(false);
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
      setStatus("Workspace settings reset.");
    } else {
      setStatus(result.error);
    }
    setBusy(false);
  };

  const openGlossary = () => {
    const glossaryPath = `${workspacePath}/.harness/settings/localization-glossary.txt`;
    window.open(`vscode://file/${glossaryPath}:1:1`, "_blank", "noreferrer");
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
            <h2>Settings</h2>
          </div>
          <button
            aria-label="Close Settings"
            className="settings-icon-button"
            onClick={onClose}
            title="Close Settings"
            type="button"
          >
            ×
          </button>
        </header>
        <nav aria-label="Settings sections" className="settings-tabs">
          {SETTINGS_TABS.map((tab) => (
            <button
              className={`settings-tab${activeTab === tab.id ? "active" : ""}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <main className="settings-body">
          <div className="settings-content">
            {settings ? (
              <SettingsTabContent
                activeTab={activeTab}
                coreRestartBusy={coreRestartBusy}
                coreRestartStatus={coreRestartStatus}
                onOpenGlossary={openGlossary}
                onRestartCore={restartCore}
                onUpdateProvider={updateProvider}
                settings={settings}
                update={update}
                versionError={versionError}
                versionLoading={versionLoading}
                versions={versions}
                versionUpdatingTargets={versionUpdatingTargets}
              />
            ) : (
              <div className="settings-card">Loading settings...</div>
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
            {busy ? "Resetting..." : "Reset to Defaults"}
          </button>
          <div className="settings-actions">
            <button
              className="settings-secondary"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
            <button
              className="settings-primary"
              disabled={busy || !dirty}
              onClick={save}
              type="button"
            >
              {busy ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
