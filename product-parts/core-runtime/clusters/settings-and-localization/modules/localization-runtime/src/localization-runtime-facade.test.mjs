import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function compile(file) {
  return ts.transpileModule(
    readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
}

const registryUrl = `data:text/javascript;base64,${Buffer.from(
  compile("source-dictionary-registry.ts")
).toString("base64")}`;
const glossaryUrl = `data:text/javascript;base64,${Buffer.from(
  compile("glossary-protector.ts")
).toString("base64")}`;
const userGlossaryUrl = `data:text/javascript;base64,${Buffer.from(
  compile("user-glossary-store.ts")
).toString("base64")}`;
const materializerSource = compile("localization-materializer.ts")
  .replaceAll(
    'from "./source-dictionary-registry.js";',
    `from "${registryUrl}";`
  )
  .replaceAll('from "./glossary-protector.js";', `from "${glossaryUrl}";`);
const materializerUrl = `data:text/javascript;base64,${Buffer.from(
  materializerSource
).toString("base64")}`;
const facadeSource = compile("localization-runtime-facade.ts")
  .replaceAll(
    'from "./source-dictionary-registry.js";',
    `from "${registryUrl}";`
  )
  .replaceAll(
    'from "./localization-materializer.js";',
    `from "${materializerUrl}";`
  )
  .replaceAll('from "./glossary-protector.js";', `from "${glossaryUrl}";`)
  .replaceAll('from "./user-glossary-store.js";', `from "${userGlossaryUrl}";`);
const { LocalizationRuntimeFacade } = await import(
  `data:text/javascript;base64,${Buffer.from(facadeSource).toString("base64")}`
);

const runtime = new LocalizationRuntimeFacade({
  engineCatalogs: [{ engineId: "google-gtx", languages: [] }],
  sourceDictionaries: [
    {
      category: "ui_labels",
      entries: {
        " settings.title ": "Settings",
        empty: "",
      },
      language: " EN ",
    },
  ],
});

assert.equal(runtime.getSourceText("ui_labels", "settings.title"), "Settings");
assert.equal(runtime.getSourceText("ui_labels", "missing"), null);

const payload = runtime.createRuntimePayload({
  categories: { ui_labels: "ru" },
  defaultLanguage: "en",
  uiEngineId: "google-gtx",
  workflowTermsPolicy: "keep_english",
});

assert.equal(payload.activeEngineId, "google-gtx");
assert.equal(payload.availableEngines.length, 1);
assert.deepEqual(payload.resolvedBundlesByCategory.ui_labels, {
  entries: {
    "settings.title": "Settings",
    empty: "",
  },
  language: "ru",
  source: "source_fallback",
});
assert.deepEqual(payload.resolvedBundlesByCategory.reasoning, {
  entries: {},
  language: "en",
  source: "source_fallback",
});
