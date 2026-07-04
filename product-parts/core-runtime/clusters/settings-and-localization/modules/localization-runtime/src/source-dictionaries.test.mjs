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

const dictionaryUrl = `data:text/javascript;base64,${Buffer.from(
  compile("source-dictionaries.ts")
).toString("base64")}`;
const registrySource = compile("source-dictionary-registry.ts").replace(
  'from "./source-dictionaries.js";',
  `from "${dictionaryUrl}";`
);
const [{ APPROVED_ENGLISH_SOURCE_DICTIONARIES }, { SourceDictionaryRegistry }] =
  await Promise.all([
    import(dictionaryUrl),
    import(
      `data:text/javascript;base64,${Buffer.from(registrySource).toString("base64")}`
    ),
  ]);

assert.deepEqual(
  APPROVED_ENGLISH_SOURCE_DICTIONARIES.map((dictionary) => dictionary.category),
  [
    "ui_labels",
    "ui_helper_text",
    "messages_for_the_user",
    "artifacts_for_the_user",
  ]
);

const registry = new SourceDictionaryRegistry();
assert.equal(registry.getMessage("ui_labels", "settings.title"), "Settings");
assert.equal(
  registry.getMessage("messages_for_the_user", "core.bridge.unavailable"),
  "Core runtime bridge is unavailable."
);
assert.match(
  registry.getMessage(
    "ui_helper_text",
    "settings.provider.kimiClient.apiKey.description"
  ),
  /Kimi Code Console/u
);
