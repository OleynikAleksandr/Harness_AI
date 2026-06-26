import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";
import { initializeCoreProcessBridge } from "../../core-process-bridge/src/core-process-bridge-facade.mjs";
import { openExternalUrl } from "../../vscode-link-opener/src/vscode-link-opener-facade.mjs";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(moduleDir, "../../../../../../..");

export async function createMainWindow() {
  const coreBridge = await initializeCoreProcessBridge(repositoryRoot);
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 640,
    title: "Harness AI",
    backgroundColor: "#111318",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(moduleDir, "preload.cjs"),
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url).catch((error) => {
      console.error("Failed to open external URL", error);
    });
    return { action: "deny" };
  });

  const rendererUrl = process.env.HARNESS_AI_RENDERER_URL;
  if (rendererUrl) {
    await window.loadURL(rendererUrl);
  } else {
    await window.loadFile(join(repositoryRoot, "dist/renderer/index.html"));
  }
  coreBridge.attachWindow(window);

  return window;
}

export async function startHarnessAiApp() {
  await app.whenReady();
  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow().catch((error) => {
        console.error("Failed to create Harness AI window", error);
      });
    }
  });
}
