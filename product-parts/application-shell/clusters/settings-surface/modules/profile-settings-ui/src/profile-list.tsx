import { useCallback, useEffect, useState } from "react";
import type { SessionProfileCatalogEntry } from "../../../../../../core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";

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

  const applicabilityLabel = (entry: SessionProfileCatalogEntry) => {
    if (entry.kind === "universal") {
      return t(
        "ui_helper_text",
        "settings.profileCreator.applicability.universal",
        "All supported providers"
      );
    }
    return entry.provider
      ? (providerNames[entry.provider] ?? entry.provider)
      : "";
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
            <div className="settings-version-row" key={entry.id}>
              <div className="settings-version-row-label">
                <p className="settings-version-name">{entry.name}</p>
                <p className="settings-version-text">
                  {entry.kind === "universal"
                    ? t(
                        "ui_labels",
                        "settings.profileCreator.kind.universal",
                        "Universal"
                      )
                    : t(
                        "ui_labels",
                        "settings.profileCreator.kind.individual",
                        "Individual"
                      )}
                  {" · "}
                  {applicabilityLabel(entry)}{" "}
                  <span className="settings-chip">
                    {entry.valid
                      ? t("ui_labels", "settings.profileCreator.valid", "Valid")
                      : t(
                          "ui_labels",
                          "settings.profileCreator.invalid",
                          "Invalid"
                        )}
                  </span>
                </p>
                {entry.description ? (
                  <p className="settings-version-text">{entry.description}</p>
                ) : null}
                {entry.valid || entry.issues.length === 0 ? null : (
                  <p className="settings-version-status">
                    {entry.issues.join(" ")}
                  </p>
                )}
              </div>
              <button
                className="settings-secondary"
                disabled={openingId !== null}
                onClick={() => {
                  openProfile(entry.id).catch(() => setOpeningId(null));
                }}
                type="button"
              >
                {openingId === entry.id
                  ? t(
                      "messages_for_the_user",
                      "settings.profileCreator.opening",
                      "Opening..."
                    )
                  : t(
                      "ui_labels",
                      "settings.profileCreator.edit",
                      "Edit in VS Code"
                    )}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="settings-version-status">{error}</p> : null}
    </section>
  );
}
