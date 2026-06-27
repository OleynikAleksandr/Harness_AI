import { exec } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { dialog, ipcMain } from "electron";
import {
  loadWorkspaceRegistrySnapshot,
  saveWorkspaceRegistrySnapshot,
} from "./core-state-persistence.mjs";

let bridge = null;
const execAsync = promisify(exec);

export async function initializeCoreProcessBridge(repositoryRoot) {
  if (bridge) {
    return bridge;
  }
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
  ipcMain.handle("harness-ai:core:get-session-events", (_event, sessionId) =>
    runtime.sessionEventStreamFacade.listEvents(sessionId)
  );
  ipcMain.handle("harness-ai:core:list-providers", () =>
    runtime.providerRegistryFacade.listProviders()
  );
  ipcMain.handle("harness-ai:core:create-session", (_event, request) =>
    runtime.sessionRequestHandlerFacade.createSession(request)
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
  ipcMain.handle("harness-ai:core:restart", () => {
    runtime.providerRegistryFacade.clearAdapters();
    registerProviderAdapters(runtime);
    return {
      ok: true,
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
      new runtime.ClaudeProviderFacade(model(providerId))
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

function activeWorkspacePath(runtime) {
  return runtime.workspaceRegistryFacade.getActiveWorkspace().path;
}

const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const EXEC_MAX_BUFFER_BYTES = 10 * 1_048_576;
const PROVIDER_PACKAGE_MAP = {
  claude: {
    cli: "@anthropic-ai/claude-code",
    sdk: "@anthropic-ai/claude-agent-sdk",
  },
  codex: {
    cli: "@openai/codex",
    sdk: "@openai/codex-sdk",
  },
  glmOpenCode: {
    sdk: "@opencode-ai/sdk",
  },
};
const OPENCODE_VERSION_COMMAND =
  process.platform === "win32"
    ? "opencode.cmd --version"
    : "opencode --version";
const VERSION_PATTERN = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/u;

async function loadProviderVersions() {
  const [claudeCli, claudeSdk, codexCli, codexSdk, openCodeCli, openCodeSdk] =
    await Promise.all([
      readPackageVersion(PROVIDER_PACKAGE_MAP.claude.cli),
      readPackageVersion(PROVIDER_PACKAGE_MAP.claude.sdk),
      readPackageVersion(PROVIDER_PACKAGE_MAP.codex.cli),
      readPackageVersion(PROVIDER_PACKAGE_MAP.codex.sdk),
      readCommandPackageVersion("opencode", OPENCODE_VERSION_COMMAND),
      readPackageVersion(PROVIDER_PACKAGE_MAP.glmOpenCode.sdk),
    ]);
  return {
    checkedAt: new Date().toISOString(),
    claude: { cli: claudeCli, sdk: claudeSdk },
    codex: { cli: codexCli, sdk: codexSdk },
    glmOpenCode: { cli: openCodeCli, sdk: openCodeSdk },
  };
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

async function readPackageVersion(packageName) {
  const [currentVersion, latestVersion] = await Promise.all([
    readInstalledVersion(packageName),
    readLatestVersion(packageName),
  ]);
  return {
    currentVersion,
    latestVersion,
    packageName,
  };
}

async function readCommandPackageVersion(packageName, command) {
  const [currentVersion, latestVersion] = await Promise.all([
    readCommandVersion(command),
    readLatestVersion(PROVIDER_PACKAGE_MAP.glmOpenCode.sdk),
  ]);
  return {
    currentVersion,
    latestVersion,
    packageName,
  };
}

async function readCommandVersion(command) {
  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: EXEC_MAX_BUFFER_BYTES,
    });
    return stdout.match(VERSION_PATTERN)?.[0] ?? null;
  } catch {
    return null;
  }
}

async function readInstalledVersion(packageName) {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} list -g ${packageName} --depth=0 --json`,
      { maxBuffer: EXEC_MAX_BUFFER_BYTES }
    );
    return extractInstalledVersion(packageName, stdout);
  } catch (error) {
    return extractInstalledVersion(packageName, error?.stdout ?? "");
  }
}

async function readLatestVersion(packageName) {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} view ${packageName} version --json`,
      {
        maxBuffer: EXEC_MAX_BUFFER_BYTES,
      }
    );
    const trimmed = stdout.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        return parsed.trim();
      }
      if (Array.isArray(parsed)) {
        return parsed.at(-1) ?? null;
      }
    } catch {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

function extractInstalledVersion(packageName, output) {
  try {
    const parsed = JSON.parse(output);
    return parsed.dependencies?.[packageName]?.version ?? null;
  } catch {
    return null;
  }
}

async function installLatestGlobalPackage(packageName) {
  await execAsync(`${NPM_COMMAND} install -g ${packageName}@latest`, {
    maxBuffer: EXEC_MAX_BUFFER_BYTES,
  });
}

function resolveProviderPackage(provider, target) {
  const packageName = PROVIDER_PACKAGE_MAP[provider]?.[target];
  if (!packageName) {
    throw new Error("Unknown provider update target.");
  }
  return packageName;
}

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}
