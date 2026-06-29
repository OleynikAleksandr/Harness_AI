import { X } from "lucide-react";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import type { ProviderDescriptor } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";

export function ProviderPicker({
  onClose,
  onSelect,
  providers,
  settings,
}: {
  onClose: () => void;
  onSelect: (provider: ProviderDescriptor) => void;
  providers: ProviderDescriptor[];
  settings: HarnessSettings | null;
}) {
  return (
    <div className="provider-picker-backdrop">
      <section aria-label="Choose provider" className="provider-picker-card">
        <header className="provider-picker-header">
          <div>
            <p className="session-kicker">New session</p>
            <h2>Choose provider</h2>
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

        <div className="provider-grid">
          {providers.map((provider) => {
            const model = getProviderModel(provider.id, settings);
            const isReady = provider.readinessStatus === "ready";
            return (
              <button
                className={`provider-card provider-card--${provider.readinessStatus}`}
                disabled={!isReady}
                key={provider.id}
                onClick={() => onSelect(provider)}
                type="button"
              >
                <strong>{provider.name}</strong>
                <span>{model}</span>
                <small className="provider-readiness">
                  {provider.readinessStatus === "checking" ? (
                    <span aria-hidden="true" className="provider-spinner" />
                  ) : null}
                  {provider.readinessStatus === "preparing" ? (
                    <span aria-hidden="true" className="provider-spinner" />
                  ) : null}
                  {readinessLabel(provider)}
                </small>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function readinessLabel(provider: ProviderDescriptor): string {
  if (provider.readinessStatus === "ready") {
    return "Ready";
  }
  if (provider.readinessStatus === "checking") {
    return "Checking provider...";
  }
  if (provider.readinessStatus === "preparing") {
    return "Preparing workspace...";
  }
  return provider.readinessMessage ?? "Provider setup failed.";
}

export function getProviderModel(
  providerId: ProviderDescriptor["id"],
  settings: HarnessSettings | null | undefined
): string {
  if (!settings) {
    return "cli-default";
  }
  switch (providerId) {
    case "claude":
      return settings.providers.claude.defaultModel;
    case "codex":
      return settings.providers.codex.defaultModel;
    case "kimi":
      return settings.providers.kimi.defaultModel;
    case "glm-native":
      return settings.providers.glmNative.defaultModel;
    case "glm-opencode":
      return settings.providers.glmOpenCode.defaultModel;
    case "openrouter":
      return settings.providers.openRouter.defaultModel;
    case "local-models":
      return settings.providers.localModels.defaultModel;
    default:
      return "cli-default";
  }
}
