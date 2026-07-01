import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { materializeCoreLocalizationRuntimePayload } from "./core-localization-runtime.js";

export async function rebuildCoreLocalizationRpcResult(
  workspacePath: string
): Promise<{ error: string; ok: false } | { ok: true }> {
  try {
    await materializeCoreLocalizationRuntimePayload(
      settingsStoreFacade.getSettings(workspacePath),
      true
    );
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    };
  }
}
