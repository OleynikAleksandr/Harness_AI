import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function loadFacade() {
  const sources = new Map(
    [
      "translation-response-parser.ts",
      "google-gtx-translation-engine.ts",
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
  const parserUrl = `data:text/javascript;base64,${Buffer.from(
    compiled.get("translation-response-parser.ts")
  ).toString("base64")}`;
  const googleSource = compiled
    .get("google-gtx-translation-engine.ts")
    .replace(
      'from "./translation-response-parser.js";',
      `from "${parserUrl}";`
    );
  const googleUrl = `data:text/javascript;base64,${Buffer.from(
    googleSource
  ).toString("base64")}`;
  const facadeSource = compiled
    .get("provider-translation-engines-facade.ts")
    .replace(
      'from "./google-gtx-translation-engine.js";',
      `from "${googleUrl}";`
    )
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

assert.deepEqual(
  await new ProviderTranslationEnginesFacade({
    defaultEngineId: "echo",
    engines: [translatedEngine],
  }).translate({
    category: "reasoning",
    engineId: "configured-missing-reasoning-engine",
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "Thinking",
  }),
  {
    engine: "configured-missing-reasoning-engine",
    errorCode: "no_engine",
    finalText: "Thinking",
    originalText: "Thinking",
    sourceLanguage: "en",
    status: "fallback",
    targetLanguage: "ru",
    translatedText: null,
  }
);

let alreadyTargetEngineCalls = 0;
const alreadyTargetResult = await new ProviderTranslationEnginesFacade({
  defaultEngineId: "echo",
  engines: [
    {
      id: "echo",
      translate(request) {
        alreadyTargetEngineCalls += 1;
        return translatedEngine.translate(request);
      },
    },
  ],
}).translate({
  category: "reasoning",
  engineId: "echo",
  sourceLanguage: "en",
  targetLanguage: "ru",
  text: "Теперь я вижу полную картину: node находится в `/usr/local/bin/node`.",
});

assert.equal(alreadyTargetEngineCalls, 0);
assert.deepEqual(alreadyTargetResult, {
  engine: "echo",
  finalText:
    "Теперь я вижу полную картину: node находится в `/usr/local/bin/node`.",
  originalText:
    "Теперь я вижу полную картину: node находится в `/usr/local/bin/node`.",
  sourceLanguage: "en",
  status: "translated",
  targetLanguage: "ru",
  translatedText:
    "Теперь я вижу полную картину: node находится в `/usr/local/bin/node`.",
});

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
