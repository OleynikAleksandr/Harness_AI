import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const engineSource = ts.transpileModule(
  readFileSync(
    new URL("./openrouter-translation-engine.ts", import.meta.url),
    "utf8"
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const { OpenRouterTranslationEngine } = await import(
  `data:text/javascript;base64,${Buffer.from(engineSource).toString("base64")}`
);

const request = {
  sourceLanguage: "en",
  targetLanguage: "ru",
  text: "I am checking the plan.",
  timeoutMs: 5000,
};
const reply = (status, content = "Проверяю план.") =>
  new Response(
    JSON.stringify(
      status === 200
        ? { choices: [{ message: { content } }] }
        : { error: { code: status, message: "No endpoints found" } }
    ),
    { status }
  );

const originalFetch = globalThis.fetch;
const run = async (endpointTag, statuses) => {
  const bodies = [];
  globalThis.fetch = (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return Promise.resolve(reply(statuses[bodies.length - 1] ?? 200));
  };
  const engine = new OpenRouterTranslationEngine({
    apiKey: "test-key",
    endpointTag,
    id: "openrouter-reasoning-translation",
    model: "google/gemini-2.5-flash-lite",
  });
  return { bodies, result: await engine.translate(request) };
};

try {
  // A pinned endpoint that disappeared (404) is retried once on default
  // routing; the retry carries no provider pin.
  const missing = await run("google-vertex", [404, 200]);
  assert.equal(missing.result.status, "translated");
  assert.equal(missing.result.finalText, "Проверяю план.");
  assert.equal(missing.bodies.length, 2);
  assert.deepEqual(missing.bodies[0].provider, {
    allow_fallbacks: false,
    order: ["google-vertex"],
  });
  assert.equal(missing.bodies[1].provider, undefined);

  // A rate-limited pinned endpoint (429) gets the same single retry.
  const limited = await run("google-ai-studio", [429, 200]);
  assert.equal(limited.result.status, "translated");
  assert.equal(limited.bodies.length, 2);

  // Other errors are not retried; the fallback records the HTTP status.
  const denied = await run("google-ai-studio", [401]);
  assert.equal(denied.result.status, "fallback");
  assert.equal(denied.result.errorCode, "non_ok_response_401");
  assert.equal(denied.bodies.length, 1);

  // A failing retry reports the retry's status.
  const bothDown = await run("google-vertex", [404, 429]);
  assert.equal(bothDown.result.errorCode, "non_ok_response_429");
  assert.equal(bothDown.bodies.length, 2);

  // Default routing is never retried.
  const automatic = await run("default", [404]);
  assert.equal(automatic.result.errorCode, "non_ok_response_404");
  assert.equal(automatic.bodies.length, 1);
  assert.equal(automatic.bodies[0].provider, undefined);

  console.log("openrouter translation engine tests passed");
} finally {
  globalThis.fetch = originalFetch;
}
