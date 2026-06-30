import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function loadFacade() {
  const sources = new Map(
    [
      "translation-text-format-normalizer.ts",
      "provider-translation-engines-facade.ts",
    ].map((file) => [
      file,
      readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
    ])
  );
  const compiled = new Map(
    [...sources].map(([file, source]) => [
      file,
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    ])
  );
  const normalizerUrl = `data:text/javascript;base64,${Buffer.from(
    compiled.get("translation-text-format-normalizer.ts")
  ).toString("base64")}`;
  const facadeSource = compiled
    .get("provider-translation-engines-facade.ts")
    .replace(
      'from "./translation-text-format-normalizer.js";',
      `from "${normalizerUrl}";`
    );
  return import(
    `data:text/javascript;base64,${Buffer.from(facadeSource).toString("base64")}`
  );
}

const { ProviderTranslationEnginesFacade } = await loadFacade();

const translatedEngine = {
  id: "echo",
  translate(request) {
    const text =
      "**Translated Title** translatedText with CodeAIHub\u0422\u043e\u043a\u0435\u043d and `CodeAIHub\u0422\u043e\u043a\u0435\u043d`";
    return {
      engine: "echo",
      finalText: text,
      originalText: request.text,
      sourceLanguage: request.sourceLanguage,
      status: "translated",
      targetLanguage: request.targetLanguage,
      translatedText: text,
    };
  },
};

const facade = new ProviderTranslationEnginesFacade({
  defaultEngineId: "echo",
  engines: [translatedEngine],
});

assert.deepEqual(
  await facade.translate({
    sourceLanguage: "en",
    targetLanguage: "en",
    text: "Already source",
  }),
  {
    engine: "unresolved",
    finalText: "Already source",
    originalText: "Already source",
    sourceLanguage: "en",
    status: "skipped",
    targetLanguage: "en",
    translatedText: null,
  }
);

assert.deepEqual(
  await new ProviderTranslationEnginesFacade({
    defaultEngineId: "echo",
    engines: [translatedEngine],
  }).translate({
    engineId: "missing",
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "Hello",
  }),
  {
    engine: "missing",
    errorCode: "no_engine",
    finalText: "Hello",
    originalText: "Hello",
    sourceLanguage: "en",
    status: "fallback",
    targetLanguage: "ru",
    translatedText: null,
  }
);

const fallbackResult = await new ProviderTranslationEnginesFacade({
  defaultEngineId: "echo",
  engines: [translatedEngine],
}).translate({
  engineId: " ",
  sourceLanguage: "en",
  targetLanguage: "ru",
  text: "Hello",
});

assert.equal(fallbackResult.status, "translated");
assert.equal(fallbackResult.engine, "echo");

const translatedResult = await facade.translate({
  sourceLanguage: "en",
  targetLanguage: "ru",
  text: "Hello",
});

assert.equal(
  translatedResult.finalText,
  "**Translated Title**\n\ntranslatedText with CodeAIHub \u0422\u043e\u043a\u0435\u043d and `CodeAIHub\u0422\u043e\u043a\u0435\u043d`"
);
