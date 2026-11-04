import { dialog, ipcMain } from "electron";
import { createCoreProcessSupervisor } from "./core-process-supervisor.mjs";

const IPC_TO_RPC = {
  "harness-ai:core:create-session": "create-session",
  "harness-ai:core:list-profile-studio-targets": "list-profile-studio-targets",
  "harness-ai:core:list-profile-studio-profiles":
    "list-profile-studio-profiles",
  "harness-ai:core:get-profile-studio-profile": "get-profile-studio-profile",
  "harness-ai:core:create-profile-studio-draft": "create-profile-studio-draft",
  "harness-ai:core:approve-profile-studio-draft":
    "approve-profile-studio-draft",
  "harness-ai:core:delete-profile-studio-profile":
    "delete-profile-studio-profile",
  "harness-ai:core:delete-session": "delete-session",
  "harness-ai:core:ensure-glossary-file": "ensure-glossary-file",
  "harness-ai:core:list-session-profiles": "list-session-profiles",
  "harness-ai:core:create-session-profile": "create-session-profile",
  "harness-ai:core:open-session-profile-file": "open-session-profile-file",
  "harness-ai:core:capture-native-request": "capture-native-request",
  "harness-ai:core:list-capturable-models": "list-capturable-models",
  "harness-ai:core:get-localization-runtime-payload":
    "get-localization-runtime-payload",
  "harness-ai:core:get-local-models": "get-local-models",
  "harness-ai:core:get-provider-system-settings":
    "get-provider-system-settings",
  "harness-ai:core:get-provider-versions": "get-provider-versions",
  "harness-ai:core:get-session-events": "get-session-events",
  "harness-ai:core:get-settings": "get-settings",
  "harness-ai:core:list-provider-model-catalogs":
    "list-provider-model-catalogs",
  "harness-ai:core:list-providers": "list-providers",
  "harness-ai:core:list-sessions": "list-sessions",
  "harness-ai:core:list-workspaces": "list-workspaces",
  "harness-ai:core:rebuild-localization": "rebuild-localization",
  "harness-ai:core:regenerate-session-title": "regenerate-session-title",
  "harness-ai:core:rename-session": "rename-session",
  "harness-ai:core:respond-provider-interaction":
    "respond-provider-interaction",
  "harness-ai:core:remove-workspace": "remove-workspace",
  "harness-ai:core:reset-workspace-settings": "reset-workspace-settings",
  "harness-ai:core:rollback-session-turns": "rollback-session-turns",
  "harness-ai:core:save-provider-system-settings":
    "save-provider-system-settings",
  "harness-ai:core:save-settings": "save-settings",
  "harness-ai:core:select-workspace": "select-workspace",
  "harness-ai:core:set-local-model-context": "set-local-model-context",
  "harness-ai:core:send-message": "send-message",
  "harness-ai:core:stop-turn": "stop-turn",
  "harness-ai:core:translate-dynamic-text": "translate-dynamic-text",
  "harness-ai:core:update-provider-version": "update-provider-version",
  "harness-ai:core:workflow-autopilot-get": "workflow-autopilot-get",
  "harness-ai:core:workflow-doctor": "workflow-doctor",
  "harness-ai:core:workflow-identity-set": "workflow-identity-set",
  "harness-ai:core:workflow-inspect": "workflow-inspect",
  "harness-ai:core:workflow-mode-choice-get": "workflow-mode-choice-get",
  "harness-ai:core:workflow-mode-choose": "workflow-mode-choose",
  "harness-ai:core:workflow-pause-set": "workflow-pause-set",
  "harness-ai:core:workflow-prepare-project": "workflow-prepare-project",
  "harness-ai:core:workflow-status": "workflow-status",
};
const EVENT_STREAM_RECONNECT_MS = 1000;

let bridge = null;

export async function initializeCoreProcessBridge(repositoryRoot) {
  if (bridge) {
    return bridge;
  }
  const coreSupervisor = createCoreProcessSupervisor(repositoryRoot);
  await coreSupervisor.start();
  const coreClient = createCoreClient(coreSupervisor.getConnectionInfo());
  const webContentsTargets = new Set();
  let stopEventStream = connectCoreEvents(coreClient, webContentsTargets);

  for (const [channel, method] of Object.entries(IPC_TO_RPC)) {
    ipcMain.handle(channel, (_event, payload) =>
      coreClient.rpc(method, payload)
    );
  }

  ipcMain.handle("harness-ai:core:pick-workspace-folder", async () => {
    const result = await dialog.showOpenDialog({
      buttonLabel: "Select Workspace Folder",
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true, ok: false };
    }
    return coreClient.rpc("add-workspace", result.filePaths[0]);
  });

  // Project pickers only return a path; Core inspects and prepares it.
  ipcMain.handle("harness-ai:core:pick-project-folder", () =>
    pickFolder("Open Project")
  );
  ipcMain.handle("harness-ai:core:pick-project-parent", () =>
    pickFolder("Select Parent Folder")
  );

  ipcMain.handle("harness-ai:core:restart", async () => {
    stopEventStream();
    try {
      await coreSupervisor.restart();
    } catch (error) {
      stopEventStream = connectCoreEvents(coreClient, webContentsTargets);
      return { error: toErrorMessage(error), ok: false };
    }
    stopEventStream = connectCoreEvents(coreClient, webContentsTargets);
    try {
      return {
        core: coreSupervisor.getConnectionInfo(),
        ok: true,
        providers: await coreClient.rpc("list-providers"),
        settings: await coreClient.rpc("get-settings"),
      };
    } catch (error) {
      return { error: toErrorMessage(error), ok: false };
    }
  });

  bridge = {
    attachWindow(window) {
      const webContents = window.webContents;
      webContentsTargets.add(webContents);
      window.on("closed", () => {
        webContentsTargets.delete(webContents);
      });
    },
    async stopCore() {
      stopEventStream();
      try {
        await coreSupervisor.stop();
        return { ok: true };
      } catch (error) {
        stopEventStream = connectCoreEvents(coreClient, webContentsTargets);
        return { error: toErrorMessage(error), ok: false };
      }
    },
  };
  return bridge;
}

async function pickFolder(buttonLabel) {
  const result = await dialog.showOpenDialog({
    buttonLabel,
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true, path: null };
  }
  return { canceled: false, path: result.filePaths[0] };
}

function createCoreClient(connectionInfo) {
  return {
    async rpc(method, payload) {
      const response = await fetch(`${connectionInfo.baseUrl}/api/v1/rpc`, {
        body: JSON.stringify({ method, payload }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const envelope = await response.json();
      if (!response.ok || envelope?.ok === false) {
        throw new Error(envelope?.error ?? `Core RPC failed: ${method}`);
      }
      return envelope.result;
    },
    async streamEvents(signal, onEvent) {
      const response = await fetch(`${connectionInfo.baseUrl}/api/v1/events`, {
        signal,
      });
      if (!(response.ok && response.body)) {
        throw new Error(`Core event stream failed: ${response.status}`);
      }
      let buffer = "";
      for await (const chunk of response.body) {
        buffer += Buffer.from(chunk).toString("utf8");
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const event = parseSseFrame(frame);
          if (event !== null) {
            onEvent(event);
          }
        }
      }
    },
  };
}

function connectCoreEvents(coreClient, webContentsTargets) {
  const controller = new AbortController();
  let reconnectTimer = null;
  const run = async () => {
    try {
      await coreClient.streamEvents(controller.signal, (event) => {
        forwardCoreEvent(webContentsTargets, event);
      });
    } catch {
      if (!controller.signal.aborted) {
        reconnectTimer = setTimeout(run, EVENT_STREAM_RECONNECT_MS);
      }
    }
  };
  run().catch(() => undefined);
  return () => {
    controller.abort();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
  };
}

function forwardCoreEvent(webContentsTargets, event) {
  for (const target of webContentsTargets) {
    if (target.isDestroyed()) {
      webContentsTargets.delete(target);
    } else {
      target.send("harness-ai:core-event", event);
    }
  }
}

function parseSseFrame(frame) {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n");
  if (!data) {
    return null;
  }
  return JSON.parse(data);
}

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
