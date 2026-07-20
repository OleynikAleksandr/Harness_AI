import { ArrowLeft, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { SessionProfileCatalogEntry } from "../../../../../../core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog-facade.js";
import type { ProviderDescriptor } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";

const NATIVE_PROFILE_ID = "native";

// Core announces profile file changes on disk with this event type; the step
// reloads the catalog so an edit in VS Code shows up without an app restart.
function isSessionProfilesUpdatedEvent(event: unknown): boolean {
  return (
    typeof event === "object" &&
    event !== null &&
    (event as { type?: unknown }).type === "session-profiles:updated"
  );
}

/**
 * Second step of the new-session flow: the session profile picker. The list,
 * applicability and preselection all come from Core read models; the step
 * only submits the user's choice (docs/architecture/SessionProfiles.md).
 */
export function SessionProfileStep({
  model,
  onBack,
  onClose,
  onStart,
  provider,
}: {
  model: string;
  onBack: () => void;
  onClose: () => void;
  onStart: (profileId: string) => Promise<string | null>;
  provider: ProviderDescriptor;
}) {
  const [profiles, setProfiles] = useState<
    readonly SessionProfileCatalogEntry[] | null
  >(null);
  const [selectedProfileId, setSelectedProfileId] =
    useState<string>(NATIVE_PROFILE_ID);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const loadProfiles = useCallback(
    (preserveSelection: boolean) => {
      let cancelled = false;
      window.harnessCore
        ?.listSessionProfiles({ modelId: model, providerId: provider.id })
        .then((result) => {
          if (cancelled || !result) {
            return;
          }
          if (!result.ok) {
            setError(result.error);
            setProfiles([]);
            return;
          }
          setProfiles(result.profiles);
          const remembered =
            result.lastSelectedProfileByProvider[provider.id] ??
            NATIVE_PROFILE_ID;
          const rememberedEntry = result.profiles.find(
            (entry) => entry.id === remembered && entry.valid
          );
          const fallbackId = rememberedEntry
            ? rememberedEntry.id
            : NATIVE_PROFILE_ID;
          setSelectedProfileId((current) =>
            preserveSelection &&
            result.profiles.some((entry) => entry.id === current && entry.valid)
              ? current
              : fallbackId
          );
        })
        .catch(() => {
          if (!cancelled) {
            setError("Core runtime bridge is unavailable.");
            setProfiles([]);
          }
        });
      return () => {
        cancelled = true;
      };
    },
    [model, provider.id]
  );

  useEffect(() => loadProfiles(false), [loadProfiles]);

  useEffect(() => {
    const unsubscribe = window.harnessCore?.onEvent((event) => {
      if (isSessionProfilesUpdatedEvent(event)) {
        // A reload after a file edit keeps the user's still-valid selection.
        loadProfiles(true);
      }
    });
    return unsubscribe;
  }, [loadProfiles]);

  const selectedProfile = profiles?.find(
    (entry) => entry.id === selectedProfileId
  );

  async function startSession() {
    setStarting(true);
    setError(null);
    const startError = await onStart(selectedProfileId);
    if (startError) {
      setError(startError);
      setStarting(false);
    }
  }

  return (
    <div className="provider-picker-backdrop">
      <section aria-label="Choose profile" className="provider-picker-card">
        <header className="provider-picker-header">
          <div>
            <p className="session-kicker">New session · {provider.name}</p>
            <h2>Choose profile</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </header>

        <div className="session-profile-step-body">
          <label className="session-profile-step-label">
            Session profile
            <select
              className="session-profile-step-select"
              onChange={(event) => setSelectedProfileId(event.target.value)}
              value={selectedProfileId}
            >
              {(profiles ?? []).map((entry) => (
                <option disabled={!entry.valid} key={entry.id} value={entry.id}>
                  {entry.valid ? entry.name : `${entry.name} (invalid)`}
                </option>
              ))}
            </select>
          </label>
          <p className="session-profile-step-description">
            {profiles === null
              ? "Loading profiles..."
              : (selectedProfile?.description ??
                "The channel's default behavior with no Harness interference.")}
          </p>
          {error ? <p className="session-profile-step-error">{error}</p> : null}
        </div>

        <footer className="session-profile-step-footer">
          <button
            className="session-profile-step-back"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={14} /> Providers
          </button>
          <button
            className="session-profile-step-start"
            disabled={starting || profiles === null}
            onClick={() => {
              startSession().catch(() => setStarting(false));
            }}
            type="button"
          >
            {starting ? "Starting..." : "Start session"}
          </button>
        </footer>
      </section>
    </div>
  );
}
