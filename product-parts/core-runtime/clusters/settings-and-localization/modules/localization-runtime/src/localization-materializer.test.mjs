import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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

const dictionariesUrl = `data:text/javascript;base64,${Buffer.from(
  compile("source-dictionaries.ts")
).toString("base64")}`;
const registrySource = compile("source-dictionary-registry.ts").replace(
  'from "./source-dictionaries.js";',
  `from "${dictionariesUrl}";`
);
const sourceRegistryUrl = `data:text/javascript;base64,${Buffer.from(
  registrySource
).toString("base64")}`;
const glossaryUrl = `data:text/javascript;base64,${Buffer.from(
  compile("glossary-protector.ts")
).toString("base64")}`;
const materializerSource = compile("localization-materializer.ts")
  .replaceAll(
    'from "./source-dictionary-registry.js";',
    `from "${sourceRegistryUrl}";`
  )
  .replaceAll('from "./glossary-protector.js";', `from "${glossaryUrl}";`);
const [{ LocalizationMaterializer }, { SourceDictionaryRegistry }] =
  await Promise.all([
    import(
      `data:text/javascript;base64,${Buffer.from(materializerSource).toString("base64")}`
    ),
    import(sourceRegistryUrl),
  ]);

let translateCount = 0;
const tempDirectory = await mkdtemp(path.join(tmpdir(), "harness-l10n-"));
try {
  const materializer = new LocalizationMaterializer({
    activeEngineCatalogs: [{ engineId: "google-gtx", languages: [] }],
    glossaryRules: [{ kind: "preserve", sourceTerm: "Harness AI" }],
    localizationRootDirectory: tempDirectory,
    sourceRegistry: new SourceDictionaryRegistry([
      {
        category: "ui_labels",
        entries: { title: "Harness AI Settings" },
        language: "en",
      },
    ]),
    translationFacade: {
      translate(request) {
        translateCount += 1;
        return {
          finalText: `[ru] ${request.text}`,
          status: "translated",
        };
      },
    },
  });

  const settings = {
    categories: { ui_labels: "ru" },
    defaultLanguage: "en",
    uiEngineId: "google-gtx",
    workflowTermsPolicy: "keep_english",
  };
  const payload = await materializer.materializeRuntimePayload(settings);
  assert.deepEqual(payload.resolvedBundlesByCategory.ui_labels, {
    entries: { title: "[ru] Harness AI Settings" },
    error: null,
    language: "ru",
    source: "materialized",
  });
  assert.equal(translateCount, 1);

  const cachedPayload = await materializer.materializeRuntimePayload(settings);
  assert.deepEqual(cachedPayload, payload);
  assert.equal(translateCount, 1);
} finally {
  await rm(tempDirectory, { force: true, recursive: true });
}
