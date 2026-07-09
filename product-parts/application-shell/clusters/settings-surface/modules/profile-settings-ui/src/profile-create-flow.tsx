import { useEffect, useState } from "react";
import { PROFILE_SUPPORTED_PROVIDER_IDS } from "../../../../../../core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog-facade.js";
import type { SessionProfileDocumentPaths } from "../../../../../../core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";

export function ProfileCreateFlow({
  onCreated,
}: {
  onCreated?: (profileId: string) => void;
}) {
  const { t } = useBrowserLocalization();
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState<string>(
    PROFILE_SUPPORTED_PROVIDER_IDS[0]
  );
  const [providerNames, setProviderNames] = useState<
    Readonly<Record<string, string>>
  >({});
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
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
  }, [open]);

  const reset = () => {
    setOpen(false);
    setProviderId(PROFILE_SUPPORTED_PROVIDER_IDS[0]);
    setName("");
  };

  const create = async () => {
    if (!window.harnessCore) {
      setStatus("Core runtime bridge is unavailable.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const result = await window.harnessCore.createSessionProfile({
        name,
        provider: providerId,
      });
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      openDocumentsInVsCode(result.documents);
      setStatus(
        `${t(
          "messages_for_the_user",
          "settings.profileCreator.created",
          "Profile created and opened in VS Code:"
        )} ${result.id}`
      );
      reset();
      onCreated?.(result.id);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Profile creation failed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>
          {t("ui_labels", "settings.profileCreator.newProfile", "New Profile")}
        </h3>
      </div>
      {open ? (
        <>
          <div className="settings-grid two">
            <label className="settings-field" htmlFor="profile-create-provider">
              <span>
                {t("ui_labels", "settings.profileCreator.provider", "Provider")}
              </span>
              <select
                id="profile-create-provider"
                onChange={(event) => setProviderId(event.target.value)}
                value={providerId}
              >
                {PROFILE_SUPPORTED_PROVIDER_IDS.map((id) => (
                  <option key={id} value={id}>
                    {providerNames[id] ?? id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="settings-field" htmlFor="profile-create-name">
            <span>
              {t("ui_labels", "settings.profileCreator.name", "Profile name")}
            </span>
            <input
              id="profile-create-name"
              onChange={(event) => setName(event.target.value)}
              placeholder={t(
                "ui_helper_text",
                "settings.profileCreator.namePlaceholder",
                "e.g. Deep Review"
              )}
              value={name}
            />
          </label>
          <div className="settings-core-row">
            <button
              className="settings-primary"
              disabled={busy || !name.trim()}
              onClick={() => {
                create().catch(() => setBusy(false));
              }}
              type="button"
            >
              {busy
                ? t(
                    "messages_for_the_user",
                    "settings.profileCreator.creating",
                    "Creating..."
                  )
                : t("ui_labels", "settings.profileCreator.create", "Create")}
            </button>
            <button
              className="settings-secondary"
              disabled={busy}
              onClick={reset}
              type="button"
            >
              {t("ui_labels", "common.cancel", "Cancel")}
            </button>
          </div>
        </>
      ) : (
        <div className="settings-core-row">
          <button
            className="settings-secondary"
            onClick={() => {
              setStatus("");
              setOpen(true);
            }}
            type="button"
          >
            {t(
              "ui_labels",
              "settings.profileCreator.newProfile",
              "New Profile"
            )}
          </button>
        </div>
      )}
      {status ? <span className="settings-status">{status}</span> : null}
    </section>
  );
}

/**
 * The Electron host resolves vscode://file links through the
 * vscode-link-opener module; the prompt opens last so it lands as the
 * active editor tab.
 */
function openDocumentsInVsCode(documents: SessionProfileDocumentPaths) {
  for (const filePath of [
    documents.passportPath,
    documents.toolingPath,
    documents.promptPath,
  ]) {
    window.open(`vscode://file/${filePath}:1:1`, "_blank", "noreferrer");
  }
}
