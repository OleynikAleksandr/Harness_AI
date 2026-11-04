import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
  assert.equal(
    existsSync(
      path.join(tempDirectory, "cache", "browser-runtime-bootstrap.json")
    ),
    true
  );
  assert.equal(
    existsSync(path.join(tempDirectory, "catalogs", "ui_labels", "ru.json")),
    true
  );

  const cachedPayload = await materializer.materializeRuntimePayload(settings);
  assert.deepEqual(cachedPayload, payload);
  assert.equal(translateCount, 1);

  const settingsWithDifferentEngine = {
    ...settings,
    uiEngineId: "openrouter-ui-translation",
  };
  const payloadAfterEngineChange = await materializer.materializeRuntimePayload(
    settingsWithDifferentEngine
  );
  assert.equal(
    translateCount,
    2,
    "changing the translation engine for the same target language must trigger a fresh translation instead of reusing the previous engine's cached bundle"
  );
  assert.deepEqual(
    payloadAfterEngineChange.resolvedBundlesByCategory.ui_labels,
    {
      entries: { title: "[ru] Harness AI Settings" },
      error: null,
      language: "ru",
      source: "materialized",
    }
  );
} finally {
  await rm(tempDirectory, { force: true, recursive: true });
}

// Incremental refresh: new or changed source keys are translated, unchanged
// keys reuse the cached translation, and failed entries are retried.
const refreshDirectory = await mkdtemp(path.join(tmpdir(), "harness-l10n-"));
try {
  const translated = [];
  let failing = new Set();
  const translationFacade = {
    translate(request) {
      translated.push(request.text);
      return failing.has(request.text)
        ? { errorCode: "engine_down", finalText: "", status: "fallback" }
        : { finalText: `[ru] ${request.text}`, status: "translated" };
    },
  };
  const materializerFor = (entries) =>
    new LocalizationMaterializer({
      activeEngineCatalogs: [],
      localizationRootDirectory: refreshDirectory,
      sourceRegistry: new SourceDictionaryRegistry([
        { category: "ui_labels", entries, language: "en" },
        {
          category: "ui_helper_text",
          entries: { hint: "Pick one" },
          language: "en",
        },
      ]),
      translationFacade,
    });
  const ruSettings = {
    categories: { ui_helper_text: "ru", ui_labels: "ru" },
    defaultLanguage: "en",
    uiEngineId: "google-gtx",
    workflowTermsPolicy: "keep_english",
  };
  const bootstrapPath = path.join(
    refreshDirectory,
    "cache",
    "browser-runtime-bootstrap.json"
  );

  await materializerFor({
    choose: "Choose",
    title: "Settings",
  }).materializeRuntimePayload(ruSettings);
  assert.deepEqual(translated.sort(), ["Choose", "Pick one", "Settings"]);

  // A new key and a changed key are translated; the unchanged key and the
  // untouched category are reused without calling the engine.
  translated.length = 0;
  const refreshed = await materializerFor({
    choose: "Choose",
    question: "How should the plan be executed?",
    title: "Settings page",
  }).materializeRuntimePayload(ruSettings);
  assert.deepEqual(translated.sort(), [
    "How should the plan be executed?",
    "Settings page",
  ]);
  assert.deepEqual(refreshed.resolvedBundlesByCategory.ui_labels, {
    entries: {
      choose: "[ru] Choose",
      question: "[ru] How should the plan be executed?",
      title: "[ru] Settings page",
    },
    error: null,
    language: "ru",
    source: "materialized",
  });
  assert.equal(
    refreshed.resolvedBundlesByCategory.ui_helper_text.entries.hint,
    "[ru] Pick one"
  );

  // A failed entry falls back to English, the payload is not cached as
  // final, and the next pass retries only that entry.
  translated.length = 0;
  failing = new Set(["Recommended"]);
  const withFailure = await materializerFor({
    choose: "Choose",
    question: "How should the plan be executed?",
    recommended: "Recommended",
    title: "Settings page",
  }).materializeRuntimePayload(ruSettings);
  assert.deepEqual(translated, ["Recommended"]);
  assert.equal(
    withFailure.resolvedBundlesByCategory.ui_labels.error,
    "engine_down"
  );
  assert.equal(
    withFailure.resolvedBundlesByCategory.ui_labels.entries.recommended,
    "Recommended"
  );
  assert.equal(
    withFailure.resolvedBundlesByCategory.ui_labels.entries.choose,
    "[ru] Choose"
  );
  const staleBootstrap = JSON.parse(readFileSync(bootstrapPath, "utf8"));
  assert.equal(
    staleBootstrap.payload.resolvedBundlesByCategory.ui_labels.entries
      .recommended,
    undefined,
    "a payload with fallbacks must not replace the cached bootstrap payload"
  );

  translated.length = 0;
  failing = new Set();
  const retried = await materializerFor({
    choose: "Choose",
    question: "How should the plan be executed?",
    recommended: "Recommended",
    title: "Settings page",
  }).materializeRuntimePayload(ruSettings);
  assert.deepEqual(translated, ["Recommended"]);
  assert.equal(retried.resolvedBundlesByCategory.ui_labels.error, null);
  assert.equal(
    retried.resolvedBundlesByCategory.ui_labels.entries.recommended,
    "[ru] Recommended"
  );

  // A cached bundle without per-entry source text (the previous file format)
  // or with a missing entry cannot be reused for that entry.
  const bundlePath = path.join(
    refreshDirectory,
    "catalogs",
    "ui_labels",
    "ru.json"
  );
  const bundleFile = JSON.parse(readFileSync(bundlePath, "utf8"));
  const { question: _question, ...sourceEntries } = bundleFile.sourceEntries;
  const { title: _title, ...entries } = bundleFile.entries;
  await writeFile(
    bundlePath,
    JSON.stringify({
      ...bundleFile,
      entries,
      sourceEntries,
      sourceFingerprint: "previous",
    }),
    "utf8"
  );
  translated.length = 0;
  await materializerFor({
    choose: "Choose",
    question: "How should the plan be executed?",
    recommended: "Recommended",
    title: "Settings page",
    zzz: "New",
  }).materializeRuntimePayload(ruSettings);
  assert.deepEqual(translated.sort(), [
    "How should the plan be executed?",
    "New",
    "Settings page",
  ]);

  // `force` retranslates every entry.
  translated.length = 0;
  await materializerFor({ choose: "Choose" }).materializeRuntimePayload(
    ruSettings,
    true
  );
  assert.deepEqual(translated.sort(), ["Choose", "Pick one"]);
} finally {
  await rm(refreshDirectory, { force: true, recursive: true });
}
