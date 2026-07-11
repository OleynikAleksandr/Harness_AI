import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";
import { initializeCoreProcessBridge } from "../../core-process-bridge/src/core-process-bridge-facade.mjs";
import { openExternalUrl } from "../../vscode-link-opener/src/vscode-link-opener-facade.mjs";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(moduleDir, "../../../../../../..");
let coreBridgePromise = null;
const detachedSessionWindows = new Map();

const windowDefaults = {
  backgroundColor: "#111318",
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    preload: join(moduleDir, "preload.cjs"),
    sandbox: true,
  },
};

function coreBridge() {
  if (!coreBridgePromise) {
    coreBridgePromise = initializeCoreProcessBridge(repositoryRoot);
  }
  return coreBridgePromise;
}

export async function createHarnessWindow(options = {}) {
  const bridge = await coreBridge();
  const window = new BrowserWindow({
    ...windowDefaults,
    width: options.width ?? 1280,
    height: options.height ?? 820,
    minWidth: options.minWidth ?? 920,
    minHeight: options.minHeight ?? 640,
    title: options.title ?? "Harness AI",
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url).catch((error) => {
      console.error("Failed to open external URL", error);
    });
    return { action: "deny" };
  });

  const rendererUrl = process.env.HARNESS_AI_RENDERER_URL;
  const query = options.query ?? {};
  if (rendererUrl) {
    const url = new URL(rendererUrl);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
    await window.loadURL(url.toString());
  } else {
    await window.loadFile(join(repositoryRoot, "dist/renderer/index.html"), {
      query,
    });
  }
  bridge.attachWindow(window);

  return window;
}

export function createMainWindow() {
  return createHarnessWindow();
}

async function openDetachedSessionWindow(request) {
  const sessionId = String(request?.sessionId ?? "");
  const workspaceId = String(request?.workspaceId ?? "");
  if (!(sessionId && workspaceId)) {
    return { error: "Session id and workspace id are required.", ok: false };
  }
  const windowKey = JSON.stringify([workspaceId, sessionId]);
  const existingPromise = detachedSessionWindows.get(windowKey);
  if (existingPromise) {
    const existing = await existingPromise;
    if (!existing.isDestroyed()) {
      focusDetachedWindow(existing);
      return { focused: true, ok: true };
    }
    detachedSessionWindows.delete(windowKey);
  }
  const windowPromise = createHarnessWindow({
    height: 820,
    minHeight: 700,
    minWidth: 760,
    query: {
      mode: "detached-session",
      sessionId,
      workspaceId,
    },
    title: "Harness AI Session",
    width: 1000,
  });
  detachedSessionWindows.set(windowKey, windowPromise);
  try {
    const window = await windowPromise;
    window.once("closed", () => {
      if (detachedSessionWindows.get(windowKey) === windowPromise) {
        detachedSessionWindows.delete(windowKey);
      }
    });
    focusDetachedWindow(window);
    return { focused: false, ok: true };
  } catch (error) {
    if (detachedSessionWindows.get(windowKey) === windowPromise) {
      detachedSessionWindows.delete(windowKey);
    }
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    };
  }
}

function focusDetachedWindow(window) {
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
}

async function restartHarnessApp() {
  const bridge = await coreBridge();
  const stopped = await bridge.stopCore();
  if (!stopped.ok) {
    return stopped;
  }
  setTimeout(() => {
    app.relaunch({ args: process.argv.slice(1) });
    app.exit(0);
  }, 50);
  return { ok: true };
}

export async function startHarnessAiApp() {
  await app.whenReady();
  ipcMain.handle("harness-ai:app:detach-session", (_event, request) =>
    openDetachedSessionWindow(request)
  );
  ipcMain.handle("harness-ai:app:restart", () => restartHarnessApp());
  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow().catch((error) => {
        console.error("Failed to create Harness AI window", error);
      });
    }
  });
}
