import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./browser-localization-provider-facade.tsx", import.meta.url),
  "utf8"
);
const lookupSource = source.match(
  /export function createBrowserLocalizationLookup[\s\S]*?^\}/mu
)?.[0];
assert.ok(lookupSource);
const moduleSource = ts.transpileModule(lookupSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { createBrowserLocalizationLookup } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`
);

const lookup = createBrowserLocalizationLookup({
  activeEngineId: "google-gtx",
  availableEngines: [],
  resolvedBundlesByCategory: {
    ui_labels: {
      entries: { "settings.title": "Configuracion" },
      language: "es",
      source: "materialized",
    },
  },
});

assert.equal(
  lookup.t("ui_labels", "settings.title", "Settings"),
  "Configuracion"
);
assert.equal(lookup.t("ui_labels", "missing", "Settings"), "Settings");
