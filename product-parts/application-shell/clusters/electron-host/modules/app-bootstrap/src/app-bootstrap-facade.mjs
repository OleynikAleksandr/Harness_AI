import { BrowserWindow, app, ipcMain } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openExternalUrl } from "../../vscode-link-opener/src/vscode-link-opener-facade.mjs";
import { providerTurnRunnerFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-turn-runner/src/provider-turn-runner-facade.mjs";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(moduleDir, "../../../../../../..");
let providerTurnIpcRegistered = false;

function registerProviderTurnIpc() {
  if (providerTurnIpcRegistered) {
    return;
  }
  ipcMain.handle("harness-ai:provider-turn", async (_event, request) =>
    providerTurnRunnerFacade.runTurn(request)
  );
  providerTurnIpcRegistered = true;
}

export function createMainWindow() {
  registerProviderTurnIpc();

  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 640,
    title: "Harness AI",
    backgroundColor: "#f4f2ed",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(moduleDir, "preload.cjs"),
      sandbox: true
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalUrl(url);
    return { action: "deny" };
  });

  const rendererUrl = process.env.HARNESS_AI_RENDERER_URL;
  if (rendererUrl) {
    void window.loadURL(rendererUrl);
  } else {
    void window.loadFile(join(repositoryRoot, "dist/renderer/index.html"));
  }

  return window;
}

export async function startHarnessAiApp() {
  await app.whenReady();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}
