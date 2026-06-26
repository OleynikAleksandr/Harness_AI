import { app } from "electron";
import { startHarnessAiApp } from "./app-bootstrap-facade.mjs";

void startHarnessAiApp();

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
