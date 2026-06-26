import { useState } from "react";
import { SettingsCard, SettingsToggle } from "./settings-reference-controls.js";

export type UpdatableProviderId = "claude" | "codex";
export type VersionTarget = "cli" | "sdk";

export interface ProviderVersionEntry {
  currentVersion: null | string;
  latestVersion: null | string;
  packageName: string;
}

export interface ProviderVersionsSnapshot {
  checkedAt: string;
  claude: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
  codex: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
  glmOpenCode?: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
}

export function ProviderVersionsCard({
  autoUpdate,
  error,
  loading,
  onAutoUpdateChange,
  onUpdate,
  provider,
  snapshot,
  updatingTargets,
}: {
  autoUpdate: boolean;
  error: null | string;
  loading: boolean;
  onAutoUpdateChange: (enabled: boolean) => void;
  onUpdate: (provider: UpdatableProviderId, target: VersionTarget) => void;
  provider: "claude" | "codex" | "glmOpenCode";
  snapshot: null | ProviderVersionsSnapshot;
  updatingTargets: readonly string[];
}) {
  const [pendingTarget, setPendingTarget] = useState<null | string>(null);
  let title = "OpenCode Versions";
  if (provider === "claude") {
    title = "Claude Versions";
  } else if (provider === "codex") {
    title = "Codex Versions";
  }
  const rows = versionRows(provider, snapshot);
  const handleUpdate = (target: VersionTarget) => {
    if (provider === "glmOpenCode") {
      return;
    }
    const key = `${provider}:${target}`;
    if (pendingTarget !== key) {
      setPendingTarget(key);
      return;
    }
    setPendingTarget(null);
    onUpdate(provider, target);
  };
  return (
    <SettingsCard
      action={
        snapshot?.checkedAt ? (
          <span className="settings-version-text">
            Checked: {formatCheckedAt(snapshot.checkedAt)}
          </span>
        ) : null
      }
      title={title}
    >
      <div className="settings-version-warning">
        Предупреждение: Обновление выполняется на ваш страх и риск. Новые версии
        могут быть несовместимы. Обновление закроет активные сеансы.
      </div>
      {provider === "glmOpenCode" ? null : (
        <SettingsToggle
          checked={autoUpdate}
          description="Автоматически проверять и обновлять CLI and SDK при запуске ядра. Ручные обновления доступны ниже."
          label={`Auto-update ${provider === "claude" ? "Claude" : "Codex"}`}
          onChange={onAutoUpdateChange}
        />
      )}
      {error ? <p className="settings-version-status">{error}</p> : null}
      {pendingTarget ? (
        <p className="settings-version-status">
          Click the highlighted button again to confirm update. Active sessions
          will close.
        </p>
      ) : null}
      {loading && rows.length === 0 ? (
        <p className="settings-version-status">
          Loading version information...
        </p>
      ) : null}
      <div className="settings-list">
        {rows.map((row) => (
          <VersionRow
            key={`${provider}:${row.target}`}
            onUpdate={
              provider === "glmOpenCode"
                ? undefined
                : () => handleUpdate(row.target)
            }
            pendingConfirmation={pendingTarget === `${provider}:${row.target}`}
            row={row}
            updating={updatingTargets.includes(`${provider}:${row.target}`)}
          />
        ))}
      </div>
    </SettingsCard>
  );
}

function VersionRow({
  onUpdate,
  pendingConfirmation,
  row,
  updating,
}: {
  onUpdate?: () => void;
  pendingConfirmation: boolean;
  row: {
    currentVersion: null | string;
    label: string;
    latestVersion: null | string;
    target: VersionTarget;
  };
  updating: boolean;
}) {
  const hasUpdate =
    row.latestVersion && row.latestVersion !== row.currentVersion && onUpdate;
  let buttonLabel = "Up to date";
  if (updating) {
    buttonLabel = `Updating to ${row.latestVersion ?? "latest"}...`;
  } else if (pendingConfirmation) {
    buttonLabel = "Click again to confirm";
  } else if (hasUpdate) {
    buttonLabel = `Update to ${row.latestVersion}`;
  } else if (row.latestVersion) {
    buttonLabel = `Up to date (${row.latestVersion})`;
  }
  return (
    <div className="settings-version-row">
      <div className="settings-version-row-label">
        <p className="settings-version-name">{row.label}</p>
        <p className="settings-version-text">
          Current: {row.currentVersion ?? "Not detected"}{" "}
          <span className="settings-chip">
            {row.latestVersion ?? "Latest: unknown"}
          </span>
        </p>
      </div>
      {onUpdate ? (
        <button
          className={
            pendingConfirmation
              ? "confirm settings-button"
              : "primary settings-button"
          }
          disabled={!hasUpdate || updating}
          onClick={onUpdate}
          type="button"
        >
          {buttonLabel}
        </button>
      ) : (
        <span className="settings-chip">
          {row.latestVersion ?? "Latest: unknown"}
        </span>
      )}
    </div>
  );
}

function versionRows(
  provider: "claude" | "codex" | "glmOpenCode",
  snapshot: null | ProviderVersionsSnapshot
) {
  if (!snapshot) {
    return [];
  }
  if (provider === "glmOpenCode" && snapshot.glmOpenCode) {
    return [
      {
        currentVersion: snapshot.glmOpenCode.cli.currentVersion,
        label: "OpenCode CLI",
        latestVersion: snapshot.glmOpenCode.cli.latestVersion,
        target: "cli" as const,
      },
      {
        currentVersion: snapshot.glmOpenCode.sdk.currentVersion,
        label: "OpenCode SDK",
        latestVersion: snapshot.glmOpenCode.sdk.latestVersion,
        target: "sdk" as const,
      },
    ];
  }
  const providerSnapshot =
    provider === "claude" ? snapshot.claude : snapshot.codex;
  const prefix = provider === "claude" ? "Claude" : "Codex";
  return [
    {
      currentVersion: providerSnapshot.cli.currentVersion,
      label: `${prefix} CLI`,
      latestVersion: providerSnapshot.cli.latestVersion,
      target: "cli" as const,
    },
    {
      currentVersion: providerSnapshot.sdk.currentVersion,
      label: `${prefix} SDK`,
      latestVersion: providerSnapshot.sdk.latestVersion,
      target: "sdk" as const,
    },
  ];
}

function formatCheckedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(parsed.getDate()).padStart(2, "0")} ${String(
    parsed.getHours()
  ).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}
