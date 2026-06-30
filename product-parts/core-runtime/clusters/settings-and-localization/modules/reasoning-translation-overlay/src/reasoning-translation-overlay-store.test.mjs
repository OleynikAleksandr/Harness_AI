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

const facadeUrl = `data:text/javascript;base64,${Buffer.from(
  "export {};"
).toString("base64")}`;
const hashUrl = `data:text/javascript;base64,${Buffer.from(
  compile("source-hash.ts")
).toString("base64")}`;
const storeSource = compile("reasoning-translation-overlay-store.ts").replace(
  'from "./reasoning-translation-overlay-facade.js";',
  `from "${facadeUrl}";`
);
const storeUrl = `data:text/javascript;base64,${Buffer.from(
  storeSource
).toString("base64")}`;
const projectorSource = compile("reasoning-translation-overlay-projector.ts")
  .replace(
    'from "./reasoning-translation-overlay-store.js";',
    `from "${storeUrl}";`
  )
  .replace('from "./source-hash.js";', `from "${hashUrl}";`);
const [{ ReasoningTranslationOverlayStore }, { createReasoningSourceHash }] =
  await Promise.all([
    import(storeUrl),
    import(hashUrl),
    import(
      `data:text/javascript;base64,${Buffer.from(projectorSource).toString(
        "base64"
      )}`
    ),
  ]);
const { ReasoningTranslationOverlayProjector } = await import(
  `data:text/javascript;base64,${Buffer.from(projectorSource).toString("base64")}`
);

const workspacePath = await mkdtemp(path.join(tmpdir(), "harness-overlay-"));
try {
  const store = new ReasoningTranslationOverlayStore();
  const sourceText = "I need to inspect the current plan first.";
  const sourceHash = createReasoningSourceHash(sourceText);
  store.appendOverlay(
    workspacePath,
    {
      engineId: "google-gtx",
      localizedContent: "Старый перевод.",
      messageId: "m1",
      sessionId: "s1",
      sourceHash: createReasoningSourceHash("old text"),
      status: "translated",
      targetLanguage: "ru",
    },
    "2026-06-30T00:00:00.000Z"
  );
  store.appendOverlay(
    workspacePath,
    {
      engineId: "google-gtx",
      localizedContent: "Сначала проверю текущий план.",
      messageId: "m1",
      sessionId: "s1",
      sourceHash,
      status: "translated",
      targetLanguage: "ru",
    },
    "2026-06-30T00:01:00.000Z"
  );
  store.appendOverlay(
    workspacePath,
    {
      engineId: "missing-engine",
      errorCode: "no_engine",
      messageId: "m2",
      sessionId: "s1",
      sourceHash: createReasoningSourceHash("Fallback"),
      status: "fallback",
      targetLanguage: "ru",
    },
    "2026-06-30T00:02:00.000Z"
  );

  const overlays = store.listOverlays(workspacePath, "s1");
  assert.equal(overlays.length, 3);

  const projector = new ReasoningTranslationOverlayProjector();
  assert.deepEqual(
    projector.projectMessages(
      [
        { id: "m1", text: sourceText },
        { id: "m2", text: "Fallback" },
        { id: "m3", text: "No overlay" },
      ],
      overlays
    ),
    [
      {
        id: "m1",
        localizedContent: "Сначала проверю текущий план.",
        text: sourceText,
      },
      { id: "m2", text: "Fallback" },
      { id: "m3", text: "No overlay" },
    ]
  );

  store.deleteSessionOverlays(workspacePath, "s1");
  assert.deepEqual(store.listOverlays(workspacePath, "s1"), []);
} finally {
  await rm(workspacePath, { force: true, recursive: true });
}
