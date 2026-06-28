import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { dialog, ipcMain } from "electron";
import { createCoreProcessSupervisor } from "./core-process-supervisor.mjs";
import {
  loadWorkspaceRegistrySnapshot,
  saveWorkspaceRegistrySnapshot,
} from "./core-state-persistence.mjs";
import {
  installLatestGlobalPackage,
  loadProviderVersions,
  resolveProviderPackage,
} from "./provider-version-tools.mjs";

let bridge = null;

export async function initializeCoreProcessBridge(repositoryRoot) {
  if (bridge) {
    return bridge;
  }
  const coreSupervisor = createCoreProcessSupervisor(repositoryRoot);
  await coreSupervisor.start();
  const runtime = await loadRuntime(repositoryRoot);
  restoreCoreState(runtime);
  registerProviderAdapters(runtime);
  runtime.sessionRequestHandlerFacade.resumeRestoredSessions();
  const webContentsTargets = new Set();
  runtime.sessionEventStreamFacade.subscribe((event) => {
    for (const target of webContentsTargets) {
      if (target.isDestroyed()) {
        webContentsTargets.delete(target);
      } else {
        target.send("harness-ai:core-event", event);
      }
    }
  });
  ipcMain.handle("harness-ai:core:list-workspaces", () => ({
    activeWorkspaceId: runtime.workspaceRegistryFacade.getActiveWorkspace().id,
    workspaces: runtime.workspaceRegistryFacade.getKnownWorkspaces(),
  }));
  ipcMain.handle("harness-ai:core:pick-workspace-folder", async () => {
    const result = await dialog.showOpenDialog({
      buttonLabel: "Select Workspace Folder",
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true, ok: false };
    }
    const workspace = runtime.workspaceRegistryFacade.addWorkspace(
      result.filePaths[0]
    );
    runtime.workspaceRegistryFacade.selectWorkspace(workspace.id);
    saveWorkspaceRegistrySnapshot(
      runtime.workspaceRegistryFacade.getSnapshot()
    );
    runtime.providerRegistryFacade.clearAdapters();
    registerProviderAdapters(runtime);
    return { ok: true, workspace };
  });
  ipcMain.handle("harness-ai:core:select-workspace", (_event, workspaceId) => {
    try {
      const workspace = runtime.workspaceRegistryFacade.selectWorkspace(
        String(workspaceId ?? "")
      );
      saveWorkspaceRegistrySnapshot(
        runtime.workspaceRegistryFacade.getSnapshot()
      );
      runtime.providerRegistryFacade.clearAdapters();
      registerProviderAdapters(runtime);
      return { ok: true, workspace };
    } catch (error) {
      return { error: describeError(error), ok: false };
    }
  });
  ipcMain.handle("harness-ai:core:list-sessions", (_event, workspaceId) =>
    runtime.sessionRequestHandlerFacade.listSessions(workspaceId)
  );
  ipcMain.handle("harness-ai:core:get-session-events", (_event, sessionId) => {
    runtime.sessionRequestHandlerFacade
      .refreshUsageLimits(String(sessionId ?? ""))
      .catch(() => undefined);
    return runtime.sessionEventStreamFacade.listEvents(sessionId);
  });
  ipcMain.handle("harness-ai:core:list-providers", () =>
    runtime.providerRegistryFacade.listProviders()
  );
  ipcMain.handle("harness-ai:core:create-session", (_event, request) =>
    runtime.sessionRequestHandlerFacade.createSession(request)
  );
  ipcMain.handle("harness-ai:core:delete-session", (_event, sessionId) =>
    runtime.sessionRequestHandlerFacade.deleteSession(String(sessionId ?? ""))
  );
  ipcMain.handle("harness-ai:core:get-settings", (_event, workspacePath) =>
    runtime.settingsStoreFacade.getSettings(
      workspacePath || activeWorkspacePath(runtime)
    )
  );
  ipcMain.handle("harness-ai:core:get-local-models", async () => {
    try {
      return { models: await loadLocalModels(), ok: true };
    } catch (error) {
      return { error: describeError(error), ok: false };
    }
  });
  ipcMain.handle("harness-ai:core:get-provider-versions", async () => {
    try {
      return { ok: true, versions: await loadProviderVersions() };
    } catch (error) {
      return { error: describeError(error), ok: false };
    }
  });
  ipcMain.handle(
    "harness-ai:core:get-provider-system-settings",
    (_event, providerId) =>
      isProviderId(providerId)
        ? runtime.providerAuthStoreFacade.getProviderSettings(providerId)
        : {}
  );
  ipcMain.handle(
    "harness-ai:core:save-provider-system-settings",
    (_event, request) => {
      if (!isProviderId(request?.providerId)) {
        return { error: "Unknown provider.", ok: false };
      }
      const settings = runtime.providerAuthStoreFacade.saveProviderSettings(
        request.providerId,
        request.settings ?? {}
      );
      registerProviderAdapter(runtime, request.providerId);
      return { ok: true, settings };
    }
  );
  ipcMain.handle("harness-ai:core:reset-workspace-settings", () => {
    const settings = runtime.settingsStoreFacade.resetWorkspaceSettings(
      activeWorkspacePath(runtime)
    );
    registerProviderAdapters(runtime);
    return { ok: true, settings };
  });
  ipcMain.handle("harness-ai:core:save-settings", (_event, request) => {
    const settings = runtime.settingsStoreFacade.saveSettings(
      request?.settings ?? request,
      activeWorkspacePath(runtime)
    );
    registerProviderAdapters(runtime);
    return { ok: true, settings };
  });
  ipcMain.handle(
    "harness-ai:core:update-provider-version",
    async (_event, request) => {
      try {
        const packageName = resolveProviderPackage(
          request?.provider,
          request?.target
        );
        await installLatestGlobalPackage(packageName);
        runtime.providerRegistryFacade.clearAdapters();
        registerProviderAdapters(runtime);
        return { ok: true, versions: await loadProviderVersions() };
      } catch (error) {
        return { error: describeError(error), ok: false };
      }
    }
  );
  ipcMain.handle("harness-ai:core:restart", async () => {
    await coreSupervisor.restart();
    runtime.providerRegistryFacade.clearAdapters();
    registerProviderAdapters(runtime);
    return {
      ok: true,
      core: coreSupervisor.getConnectionInfo(),
      providers: runtime.providerRegistryFacade.listProviders(),
      settings: runtime.settingsStoreFacade.getSettings(
        activeWorkspacePath(runtime)
      ),
    };
  });
  ipcMain.handle("harness-ai:core:send-message", (_event, request) =>
    runtime.sessionRequestHandlerFacade.sendMessage(request)
  );
  bridge = {
    attachWindow(window) {
      const webContents = window.webContents;
      webContentsTargets.add(webContents);
      window.on("closed", () => {
        webContentsTargets.delete(webContents);
      });
    },
  };
  return bridge;
}

function restoreCoreState(runtime) {
  const workspaceSnapshot = loadWorkspaceRegistrySnapshot();
  if (workspaceSnapshot) {
    runtime.workspaceRegistryFacade.restoreSnapshot(workspaceSnapshot);
  }
  const sessions = runtime.sessionRequestHandlerFacade.restoreSessionHistory(
    runtime.workspaceRegistryFacade.getKnownWorkspaces()
  );
  runtime.sessionEventStreamFacade.configureSessionHistory(sessions);
  runtime.sessionRequestHandlerFacade.restoreTelemetryHistory(
    runtime.sessionEventStreamFacade.latestTelemetryBySession()
  );
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
    localModels,
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
    ),
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
    ...localModels,
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
  "local-models",
];

function registerProviderAdapter(runtime, providerId) {
  const workspacePath = activeWorkspacePath(runtime);
  const model = (providerId) =>
    runtime.settingsStoreFacade.getProviderModel(providerId, workspacePath)
      .selectedModel ?? runtime.providerAuthStoreFacade.getModel(providerId);
  if (providerId === "claude") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.ClaudeProviderFacade(model(providerId), workspacePath)
    );
  }
  if (providerId === "codex") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.CodexProviderFacade({
        defaultModel: model(providerId),
        workspacePath,
      })
    );
  }
  if (providerId === "kimi") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.KimiProviderFacade(model(providerId), workspacePath)
    );
  }
  if (providerId === "glm-native") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.GlmNativeProviderFacade(model(providerId), workspacePath)
    );
  }
  if (providerId === "glm-opencode") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.GlmOpenCodeProviderFacade(model(providerId), workspacePath)
    );
  }
  if (providerId === "openrouter") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.OpenRouterProviderFacade(model(providerId), workspacePath)
    );
  }
  if (providerId === "local-models") {
    runtime.providerRegistryFacade.registerAdapter(
      providerId,
      new runtime.LocalModelsProviderFacade(model(providerId), workspacePath)
    );
  }
}

function isProviderId(value) {
  return PROVIDER_IDS.includes(value);
}

function activeWorkspacePath(runtime) {
  return runtime.workspaceRegistryFacade.getActiveWorkspace().path;
}

async function loadLocalModels() {
  if (typeof fetch !== "function") {
    return [];
  }
  const response = await fetch("http://127.0.0.1:1234/v1/models");
  if (!response.ok) {
    return [];
  }
  const payload = await response.json();
  return Array.isArray(payload?.data)
    ? payload.data
        .map((model) => (typeof model?.id === "string" ? model.id : null))
        .filter(Boolean)
    : [];
}

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}
