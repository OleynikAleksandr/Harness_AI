import path from "node:path";
import { UserGlossaryStore } from "../../../../settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.js";
import { resolveCoreLocalizationRootDirectory } from "./core-localization-runtime.js";

export async function ensureCoreGlossaryFileRpcResult(): Promise<
  { error: string; ok: false } | { filePath: string; ok: true }
> {
  try {
    const filePath = await new UserGlossaryStore({
      glossaryDirectory: path.join(
        resolveCoreLocalizationRootDirectory(),
        "glossary"
      ),
    }).ensureEditableGlossaryFile();
    return { filePath, ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    };
  }
}
