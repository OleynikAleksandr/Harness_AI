import { RotateCcw, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { SETTINGS_TABS, type SettingsTabId } from "./settings-model-options.js";
import { SettingsTabContent } from "./settings-tab-content.js";
import "./settings-surface.css";

interface ProviderSettingsUiFacadeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProviderSettingsUiFacade({
  isOpen,
  onClose,
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

  return (
    <div className="settings-backdrop" role="presentation">
      <div aria-modal="true" className="settings-dialog" role="dialog">
        <header className="settings-header">
          <div className="settings-title">
            <h2>Settings</h2>
            <span>Harness AI</span>
          </div>
          <button
            aria-label="Close Settings"
            className="settings-icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </header>
        <main className="settings-body">
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
          <div className="settings-content">
            {settings ? (
              <SettingsTabContent
                activeTab={activeTab}
                coreRestartBusy={coreRestartBusy}
                coreRestartStatus={coreRestartStatus}
                onRestartCore={restartCore}
                settings={settings}
                update={update}
              />
            ) : (
              <div className="settings-card">Loading settings...</div>
            )}
          </div>
        </main>
        <footer className="settings-footer">
          <span className="settings-status">{status}</span>
          <div className="settings-actions">
            <button
              className="settings-secondary"
              disabled={busy}
              onClick={reset}
              type="button"
            >
              <RotateCcw size={14} />
              Reset Workspace
            </button>
            <button
              className="settings-primary"
              disabled={busy || !dirty}
              onClick={save}
              type="button"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
