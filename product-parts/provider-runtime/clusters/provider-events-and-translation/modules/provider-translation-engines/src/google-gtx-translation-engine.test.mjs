import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const GOOGLE_TRANSLATE_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t";

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

const parserUrl = `data:text/javascript;base64,${Buffer.from(
  compile("translation-response-parser.ts")
).toString("base64")}`;
const engineSource = compile("google-gtx-translation-engine.ts").replace(
  'from "./translation-response-parser.js";',
  `from "${parserUrl}";`
);
const { GoogleGtxTranslationEngine } = await import(
  `data:text/javascript;base64,${Buffer.from(engineSource).toString("base64")}`
);

function request(text) {
  return {
    sourceLanguage: "en",
    targetLanguage: "ru",
    text,
    timeoutMs: 5000,
  };
}

const originalFetch = globalThis.fetch;

try {
  let capturedUrl = "";
  let capturedInit;
  globalThis.fetch = (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return Promise.resolve({
      json: () => Promise.resolve([[["Привет", "Hello"]]]),
      ok: true,
      status: 200,
    });
  };

  const getResult = await new GoogleGtxTranslationEngine().translate(
    request("Hello")
  );
  assert.equal(getResult.status, "translated");
  assert.equal(getResult.finalText, "Привет");
  assert.equal(capturedInit?.method, undefined);
  assert.match(capturedUrl, /translate\.googleapis\.com/u);
  assert.match(capturedUrl, /q=Hello/u);

  globalThis.fetch = (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return Promise.resolve({
      json: () => Promise.resolve([[["Переведенный пакет", "bundle"]]]),
      ok: true,
      status: 200,
    });
  };

  const postResult = await new GoogleGtxTranslationEngine().translate(
    request("entry\n".repeat(500))
  );
  assert.equal(postResult.status, "translated");
  assert.equal(postResult.finalText, "Переведенный пакет");
  assert.equal(capturedUrl, GOOGLE_TRANSLATE_URL);
  assert.equal(capturedInit?.method, "POST");
  assert.match(String(capturedInit?.body), /q=/u);

  globalThis.fetch = () =>
    Promise.resolve({
      json: () => Promise.resolve([]),
      ok: true,
      status: 200,
    });

  assert.deepEqual(
    await new GoogleGtxTranslationEngine().translate(request("Hello")),
    {
      engine: "google-gtx",
      errorCode: "empty_translation",
      finalText: "Hello",
      originalText: "Hello",
      sourceLanguage: "en",
      status: "fallback",
      targetLanguage: "ru",
      translatedText: null,
    }
  );
} finally {
  globalThis.fetch = originalFetch;
}
