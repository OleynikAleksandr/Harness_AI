import { useCallback, useEffect, useState } from "react";
import type { SessionProfileCatalogEntry } from "../../../../../../core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog-facade.js";
import {
  type BrowserLocalizationLookup,
  useBrowserLocalization,
} from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";

/** Passport and tooling first; the prompt lands as the active editor tab. */
const PROFILE_DOCUMENTS = ["passport", "tooling", "prompt"] as const;

// Core announces profile file changes on disk with this event type; the list
// reloads through the same catalog RPC so Core stays the only truth source.
function isSessionProfilesUpdatedEvent(event: unknown): boolean {
  return (
    typeof event === "object" &&
    event !== null &&
    (event as { type?: unknown }).type === "session-profiles:updated"
  );
}

function ProfileListRow({
  entry,
  onOpen,
  openingId,
  providerNames,
  t,
}: {
  readonly entry: SessionProfileCatalogEntry;
  readonly onOpen: (profileId: string) => void;
  readonly openingId: null | string;
  readonly providerNames: Readonly<Record<string, string>>;
  readonly t: BrowserLocalizationLookup["t"];
}) {
  const isLegacyUniversal = entry.kind === "universal";
  let applicability = "";
  if (isLegacyUniversal) {
    applicability = t(
      "ui_helper_text",
      "settings.profileCreator.applicability.universal",
      "Existing legacy profile; not available for new sessions"
    );
  } else if (entry.provider) {
    applicability = providerNames[entry.provider] ?? entry.provider;
  }
  const kindLabel = isLegacyUniversal
    ? t(
        "ui_labels",
        "settings.profileCreator.kind.legacyUniversal",
        "Legacy Universal"
      )
    : t(
        "ui_labels",
        "settings.profileCreator.kind.individual",
        "Provider profile"
      );
  let actionLabel = t(
    "ui_labels",
    "settings.profileCreator.edit",
    "Edit in VS Code"
  );
  if (isLegacyUniversal) {
    actionLabel = t(
      "ui_labels",
      "settings.profileCreator.readOnly",
      "Read-only"
    );
  } else if (openingId === entry.id) {
    actionLabel = t(
      "messages_for_the_user",
      "settings.profileCreator.opening",
      "Opening..."
    );
  }

  return (
    <div className="settings-version-row">
      <div className="settings-version-row-label">
        <p className="settings-version-name">{entry.name}</p>
        <p className="settings-version-text">
          {kindLabel}
          {" · "}
          {applicability}{" "}
          <span className="settings-chip">
            {entry.valid
              ? t("ui_labels", "settings.profileCreator.valid", "Valid")
              : t("ui_labels", "settings.profileCreator.invalid", "Invalid")}
          </span>
        </p>
        {entry.description ? (
          <p className="settings-version-text">{entry.description}</p>
        ) : null}
        {entry.valid || entry.issues.length === 0 ? null : (
          <p className="settings-version-status">{entry.issues.join(" ")}</p>
        )}
      </div>
      <button
        className="settings-secondary"
        disabled={openingId !== null || isLegacyUniversal}
        onClick={() => onOpen(entry.id)}
        type="button"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export function ProfileList() {
  const { t } = useBrowserLocalization();
  const [entries, setEntries] = useState<
    readonly SessionProfileCatalogEntry[] | null
  >(null);
  const [providerNames, setProviderNames] = useState<
    Readonly<Record<string, string>>
  >({});
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<null | string>(null);

  const loadProfiles = useCallback(() => {
    let cancelled = false;
    window.harnessCore
      ?.listSessionProfiles()
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (!result.ok) {
          setError(result.error);
          setEntries([]);
          return;
        }
        setError("");
        setEntries(result.profiles.filter((entry) => entry.kind !== "native"));
      })
      .catch(() => {
        if (!cancelled) {
          setError("Core runtime bridge is unavailable.");
          setEntries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadProfiles(), [loadProfiles]);

  useEffect(() => {
    const unsubscribe = window.harnessCore?.onEvent((event) => {
      if (isSessionProfilesUpdatedEvent(event)) {
        loadProfiles();
      }
    });
    return unsubscribe;
  }, [loadProfiles]);

  useEffect(() => {
    let cancelled = false;
    window.harnessCore
      ?.listProviders()
      .then((descriptors) => {
        if (cancelled) {
          return;
        }
        const names: Record<string, string> = {};
        for (const descriptor of descriptors) {
          names[descriptor.id] = descriptor.name;
        }
        setProviderNames(names);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const openProfile = async (profileId: string) => {
    if (!window.harnessCore) {
      setError("Core runtime bridge is unavailable.");
      return;
    }
    setOpeningId(profileId);
    setError("");
    try {
      for (const document of PROFILE_DOCUMENTS) {
        const result = await window.harnessCore.openSessionProfileFile({
          document,
          profileId,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        window.open(
          `vscode://file/${result.filePath}:1:1`,
          "_blank",
          "noreferrer"
        );
      }
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>
          {t("ui_labels", "settings.profileCreator.profiles", "Profiles")}
        </h3>
      </div>
      {entries === null ? (
        <p className="settings-description">
          {t(
            "messages_for_the_user",
            "settings.profileCreator.loading",
            "Loading profiles..."
          )}
        </p>
      ) : null}
      {entries?.length === 0 ? (
        <p className="settings-description">
          {t(
            "messages_for_the_user",
            "settings.profileCreator.empty",
            "No profiles yet. Create one with New Profile above."
          )}
        </p>
      ) : null}
      {entries && entries.length > 0 ? (
        <div className="settings-list">
          {entries.map((entry) => (
            <ProfileListRow
              entry={entry}
              key={entry.id}
              onOpen={(profileId) => {
                openProfile(profileId).catch(() => setOpeningId(null));
              }}
              openingId={openingId}
              providerNames={providerNames}
              t={t}
            />
          ))}
        </div>
      ) : null}
      {error ? <p className="settings-version-status">{error}</p> : null}
    </section>
  );
}
