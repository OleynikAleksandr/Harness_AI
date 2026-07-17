import { useState } from "react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { SettingsCard, SettingsToggle } from "./settings-reference-controls.js";

export type UpdatableProviderId = "claude" | "codex" | "kimi";
export type VersionTarget = "cli" | "sdk";

const PROVIDER_LABELS: Record<UpdatableProviderId, string> = {
  claude: "Claude",
  codex: "Codex",
  kimi: "Kimi",
};

export interface ProviderVersionEntry {
  currentVersion: null | string;
  latestVersion: null | string;
  packageName: string;
}

export interface ProviderVersionsSnapshot {
  checkedAt: string;
  claude: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
  codex: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
  // Kimi has no SDK and no npm package: one CLI entry from the native
  // `kimi upgrade` channel.
  kimi: { cli: Omit<ProviderVersionEntry, "packageName"> };
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
  provider: UpdatableProviderId;
  snapshot: null | ProviderVersionsSnapshot;
  updatingTargets: readonly string[];
}) {
  const { t } = useBrowserLocalization();
  const [pendingTarget, setPendingTarget] = useState<null | string>(null);
  const title = `${PROVIDER_LABELS[provider]} Versions`;
  const rows = versionRows(provider, snapshot);
  const handleUpdate = (target: VersionTarget) => {
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
        {t(
          "messages_for_the_user",
          "settings.provider.versions.warning",
          "Warning: updating is at your own risk. New versions may be incompatible. Updating will close active sessions."
        )}
      </div>
      <SettingsToggle
        checked={autoUpdate}
        description={
          provider === "kimi"
            ? t(
                "ui_helper_text",
                "settings.provider.versions.autoUpdate.cli.description",
                "Automatically check and update the CLI when the Core starts. Manual updates are available below."
              )
            : t(
                "ui_helper_text",
                "settings.provider.versions.autoUpdate.description",
                "Automatically check and update the CLI and SDK when the Core starts. Manual updates are available below."
              )
        }
        label={`Auto-update ${PROVIDER_LABELS[provider]}`}
        onChange={onAutoUpdateChange}
      />
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
            onUpdate={() => handleUpdate(row.target)}
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
          {updating ? (
            <span aria-hidden="true" className="settings-spinner" />
          ) : null}
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
  provider: UpdatableProviderId,
  snapshot: null | ProviderVersionsSnapshot
) {
  if (!snapshot) {
    return [];
  }
  const prefix = PROVIDER_LABELS[provider];
  if (provider === "kimi") {
    return [
      {
        currentVersion: snapshot.kimi.cli.currentVersion,
        label: `${prefix} CLI`,
        latestVersion: snapshot.kimi.cli.latestVersion,
        target: "cli" as const,
      },
    ];
  }
  const providerSnapshot =
    provider === "claude" ? snapshot.claude : snapshot.codex;
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
