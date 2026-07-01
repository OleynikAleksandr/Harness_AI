import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

const providerFacadeUrl = `data:text/javascript;base64,${Buffer.from(`
  export class ProviderTranslationEnginesFacade {
    translate() {
      throw new Error("test should inject translationFacade");
    }
  }
`).toString("base64")}`;
const projectorUrl = `data:text/javascript;base64,${Buffer.from(`
  export class ReasoningTranslationOverlayProjector {}
`).toString("base64")}`;
const storeUrl = `data:text/javascript;base64,${Buffer.from(`
  export class ReasoningTranslationOverlayStore {}
`).toString("base64")}`;
const hashUrl = `data:text/javascript;base64,${Buffer.from(
  compile("source-hash.ts")
).toString("base64")}`;
const facadeSource = compile("reasoning-translation-overlay-facade.ts")
  .replace(
    'from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.js";',
    `from "${providerFacadeUrl}";`
  )
  .replace(
    'from "./reasoning-translation-overlay-projector.js";',
    `from "${projectorUrl}";`
  )
  .replaceAll(
    'from "./reasoning-translation-overlay-store.js";',
    `from "${storeUrl}";`
  )
  .replace('from "./source-hash.js";', `from "${hashUrl}";`);
const { ReasoningTranslationOverlayFacade } = await import(
  `data:text/javascript;base64,${Buffer.from(facadeSource).toString("base64")}`
);
const { createReasoningSourceHash } = await import(hashUrl);

const sourceText = "I need to inspect the current plan first.";
const expectedHash = createHash("sha256")
  .update(sourceText, "utf8")
  .digest("hex");
assert.equal(createReasoningSourceHash(sourceText), expectedHash);

const translatedFacade = new ReasoningTranslationOverlayFacade({
  translationFacade: {
    translate(request) {
      return {
        engine: request.engineId,
        finalText: "Сначала проверю текущий план.",
        originalText: request.text,
        sourceLanguage: request.sourceLanguage,
        status: "translated",
        targetLanguage: request.targetLanguage,
        translatedText: "Сначала проверю текущий план.",
      };
    },
  },
});
const settings = {
  categories: { reasoning: "ru" },
  defaultLanguage: "en",
  reasoningEngineId: "google-gtx",
};

assert.deepEqual(
  translatedFacade.resolvePendingState({
    messageId: "m1",
    sessionId: "s1",
    settings,
    sourceText,
  }),
  {
    messageId: "m1",
    sessionId: "s1",
    sourceHash: expectedHash,
    translationState: "pending",
  }
);

assert.deepEqual(
  await translatedFacade.translateVisibleReasoning({
    messageId: "m1",
    sessionId: "s1",
    settings,
    sourceText,
  }),
  {
    engineId: "google-gtx",
    localizedContent: "Сначала проверю текущий план.",
    messageId: "m1",
    sessionId: "s1",
    sourceHash: expectedHash,
    sourceText,
    status: "translated",
    targetLanguage: "ru",
  }
);

let translateCount = 0;
const disabledFacade = new ReasoningTranslationOverlayFacade({
  translationFacade: {
    translate() {
      translateCount += 1;
      throw new Error("same-language reasoning must not translate");
    },
  },
});

assert.equal(
  disabledFacade.resolvePendingState({
    messageId: "m2",
    sessionId: "s1",
    settings: {
      categories: { reasoning: "en" },
      defaultLanguage: "en",
      reasoningEngineId: "google-gtx",
    },
    sourceText,
  }),
  null
);
assert.equal(
  await disabledFacade.translateVisibleReasoning({
    messageId: "m2",
    sessionId: "s1",
    settings: {
      categories: { reasoning: "en" },
      defaultLanguage: "en",
      reasoningEngineId: "google-gtx",
    },
    sourceText,
  }),
  null
);
assert.equal(translateCount, 0);

const fallbackFacade = new ReasoningTranslationOverlayFacade({
  translationFacade: {
    translate(request) {
      return {
        engine: request.engineId,
        errorCode: "no_engine",
        finalText: request.text,
        originalText: request.text,
        sourceLanguage: request.sourceLanguage,
        status: "fallback",
        targetLanguage: request.targetLanguage,
        translatedText: null,
      };
    },
  },
});

assert.deepEqual(
  await fallbackFacade.translateVisibleReasoning({
    messageId: "m3",
    sessionId: "s1",
    settings: {
      categories: { reasoning: "ru" },
      defaultLanguage: "en",
      reasoningEngineId: "missing-engine",
    },
    sourceText,
  }),
  {
    engineId: "missing-engine",
    errorCode: "no_engine",
    messageId: "m3",
    sessionId: "s1",
    sourceHash: expectedHash,
    sourceText,
    status: "fallback",
    targetLanguage: "ru",
  }
);
