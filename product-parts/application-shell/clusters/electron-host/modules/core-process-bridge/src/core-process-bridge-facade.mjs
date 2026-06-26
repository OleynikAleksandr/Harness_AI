import { ipcMain } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let bridge = null;

export async function initializeCoreProcessBridge(repositoryRoot) {
  if (bridge) {
    return bridge;
  }
  const runtime = await loadRuntime(repositoryRoot);
  registerProviderAdapters(runtime);
  let activeWebContents = null;
  runtime.sessionEventStreamFacade.subscribe((event) => {
    if (!activeWebContents || activeWebContents.isDestroyed()) {
      return;
    }
    activeWebContents.send("harness-ai:core-event", event);
  });
  ipcMain.handle("harness-ai:core:list-providers", () =>
    runtime.providerRegistryFacade.listProviders()
  );
  ipcMain.handle("harness-ai:core:create-session", (_event, request) =>
    runtime.sessionRequestHandlerFacade.createSession(request)
  );
  ipcMain.handle("harness-ai:core:get-provider-system-settings", (_event, providerId) =>
    isProviderId(providerId)
      ? runtime.providerAuthStoreFacade.getProviderSettings(providerId)
      : {}
  );
  ipcMain.handle("harness-ai:core:save-provider-system-settings", (_event, request) => {
    if (!isProviderId(request?.providerId)) {
      return { error: "Unknown provider.", ok: false };
    }
    const settings = runtime.providerAuthStoreFacade.saveProviderSettings(
      request.providerId,
      request.settings ?? {}
    );
    registerProviderAdapter(runtime, request.providerId);
    return { ok: true, settings };
  });
  ipcMain.handle("harness-ai:core:send-message", (_event, request) =>
    runtime.sessionRequestHandlerFacade.sendMessage(request)
  );
  bridge = {
    attachWindow(window) {
      activeWebContents = window.webContents;
    }
  };
  return bridge;
}

async function loadRuntime(repositoryRoot) {
  const runtimeRoot = join(repositoryRoot, "dist/runtime/product-parts");
  const importRuntime = (relativePath) =>
    import(pathToFileURL(join(runtimeRoot, relativePath)).href);
  const [
    sessionRequest,
    sessionEvents,
    workspaceRegistry,
    providerRegistry,
    providerAuthStore,
    settingsStore,
    claude,
    codex,
    kimi,
    glmNative,
    glmOpenCode,
    openRouter,
    localModels
  ] = await Promise.all([
    importRuntime(
      "core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js"
    ),
    importRuntime(
      "core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js"
    ),
    importRuntime(
      "core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js"
    ),
    importRuntime(
      "provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js"
    ),
    importRuntime(
      "provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js"
    ),
    importRuntime(
      "core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js"
    ),
    importRuntime(
      "provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.js"
    ),
    importRuntime(
      "provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.js"
    ),
    importRuntime(
      "provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/kimi-provider-facade.js"
    ),
    importRuntime(
      "provider-runtime/clusters/provider-adapters/modules/glm-native-provider/src/glm-native-provider-facade.js"
    ),
    importRuntime(
      "provider-runtime/clusters/provider-adapters/modules/glm-opencode-provider/src/glm-opencode-provider-facade.js"
    ),
    importRuntime(
      "provider-runtime/clusters/provider-adapters/modules/openrouter-provider/src/openrouter-provider-facade.js"
    ),
    importRuntime(
      "provider-runtime/clusters/provider-adapters/modules/local-models-provider/src/local-models-provider-facade.js"
    )
  ]);
  return {
    ...sessionRequest,
    ...sessionEvents,
    ...workspaceRegistry,
    ...providerRegistry,
    ...providerAuthStore,
    ...settingsStore,
    ...claude,
    ...codex,
    ...kimi,
    ...glmNative,
    ...glmOpenCode,
    ...openRouter,
    ...localModels
  };
}

function registerProviderAdapters(runtime) {
  for (const providerId of PROVIDER_IDS) {
    registerProviderAdapter(runtime, providerId);
  }
}

const PROVIDER_IDS = [
  "claude",
  "codex",
  "kimi",
  "glm-native",
  "glm-opencode",
  "openrouter",
  "local-models"
];

function registerProviderAdapter(runtime, providerId) {
  const model = (providerId) =>
    runtime.providerAuthStoreFacade.getModel(providerId) ??
    runtime.settingsStoreFacade.getProviderModel(providerId).selectedModel;
  const workspacePath = runtime.workspaceRegistryFacade.getActiveWorkspace().path;
  if (providerId === "claude") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.ClaudeProviderFacade(model(providerId))
    );
  }
  if (providerId === "codex") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.CodexProviderFacade({
        defaultModel: model(providerId),
        workspacePath
      })
    );
  }
  if (providerId === "kimi") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.KimiProviderFacade(model(providerId))
    );
  }
  if (providerId === "glm-native") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.GlmNativeProviderFacade(model(providerId))
    );
  }
  if (providerId === "glm-opencode") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.GlmOpenCodeProviderFacade(model(providerId))
    );
  }
  if (providerId === "openrouter") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.OpenRouterProviderFacade(model(providerId))
    );
  }
  if (providerId === "local-models") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.LocalModelsProviderFacade(model(providerId))
    );
  }
}

function isProviderId(value) {
  return PROVIDER_IDS.includes(value);
}
