import { app } from "electron";
import { startHarnessAiApp } from "./app-bootstrap-facade.mjs";

startHarnessAiApp().catch((error) => {
  console.error("Failed to start Harness AI", error);
  app.exit(1);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
