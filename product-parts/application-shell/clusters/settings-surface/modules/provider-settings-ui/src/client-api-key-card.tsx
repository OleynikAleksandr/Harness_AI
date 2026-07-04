// A reusable API-key card for universal-client endpoint providers: key-only
// onboarding — the base URL and the model catalog are Core-owned, so the tab
// section holds exactly one secret field plus the provider-help copy. Each
// client provider's Settings tab mounts one, parameterized by its
// localization message prefix; each client provider ships a thin preset wrapper
// as it joins the universal client.

import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  SettingsCard,
  SettingsTextField,
} from "./settings-reference-controls.js";

export interface ClientApiKeyCardFallbacks {
  readonly description: string;
  readonly keyDescription: string;
  readonly title: string;
}

// Kimi preset: the Kimi Settings tab mounts this above the ACP model card.
const KIMI_CLIENT_FALLBACKS: ClientApiKeyCardFallbacks = {
  description:
    "Runs Kimi Code on the Harness universal client with a subscription API key. Nothing is downloaded or installed.",
  keyDescription:
    "Paste a Kimi For Coding API key from the Kimi Code Console at kimi.com. A Kimi Code subscription allows up to 5 keys; each key is shown only once when created.",
  title: "Kimi For Coding API Key",
};

const GLM_CLIENT_FALLBACKS: ClientApiKeyCardFallbacks = {
  description:
    "Runs GLM on the Harness universal client with a Z.ai Coding Plan subscription key. Nothing is downloaded or installed.",
  keyDescription:
    "Paste the Z.ai Coding Plan API key used for GLM coding access. Harness stores it in Core settings for the universal client and also accepts GLM_API_KEY or ZAI_API_KEY from the environment.",
  title: "Z.ai Coding Plan API Key",
};

export function GlmClientApiKeyCard({
  apiKey,
  onChange,
}: {
  apiKey: string;
  onChange: (apiKey: string) => void;
}) {
  return (
    <ClientApiKeyCard
      apiKey={apiKey}
      fallbacks={GLM_CLIENT_FALLBACKS}
      messagePrefix="settings.provider.glmClient"
      onChange={onChange}
    />
  );
}

export function KimiClientApiKeyCard({
  apiKey,
  onChange,
}: {
  apiKey: string;
  onChange: (apiKey: string) => void;
}) {
  return (
    <ClientApiKeyCard
      apiKey={apiKey}
      fallbacks={KIMI_CLIENT_FALLBACKS}
      messagePrefix="settings.provider.kimiClient"
      onChange={onChange}
    />
  );
}

function ClientApiKeyCard({
  apiKey,
  fallbacks,
  messagePrefix,
  onChange,
}: {
  apiKey: string;
  fallbacks: ClientApiKeyCardFallbacks;
  messagePrefix: string;
  onChange: (apiKey: string) => void;
}) {
  const { t } = useBrowserLocalization();
  return (
    <SettingsCard
      title={t("ui_labels", `${messagePrefix}.apiKey`, fallbacks.title)}
    >
      <p className="settings-description">
        {t(
          "ui_helper_text",
          `${messagePrefix}.description`,
          fallbacks.description
        )}
      </p>
      <SettingsTextField
        label={t("ui_labels", "settings.provider.apiKey", "API Key")}
        onChange={onChange}
        password
        value={apiKey}
      />
      <p className="settings-note">
        {t(
          "ui_helper_text",
          `${messagePrefix}.apiKey.description`,
          fallbacks.keyDescription
        )}
      </p>
    </SettingsCard>
  );
}
