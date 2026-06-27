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
            return (
              <button
                className="provider-card"
                key={provider.id}
                onClick={() => onSelect(provider)}
                type="button"
              >
                <strong>{provider.name}</strong>
                <span>{model}</span>
                <small>{provider.status}</small>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
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
