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

const protectorModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    compile("glossary-protector.ts")
  ).toString("base64")}`
);
const storeModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    compile("user-glossary-store.ts")
  ).toString("base64")}`
);
const { GlossaryProtector } = protectorModule;
const { UserGlossaryStore } = storeModule;

const protector = new GlossaryProtector();
const protectedText = protector.protect("CodeAI Hub and CodeAI", {
  category: "ui_labels",
  rules: [
    { kind: "preserve", sourceTerm: "CodeAI" },
    { kind: "user_preserve", sourceTerm: "CodeAI Hub" },
  ],
  targetLanguage: "ru",
});

assert.equal(
  protectedText.protectedText,
  "[[HARNESS_AI_TERM_0]] and [[HARNESS_AI_TERM_1]]"
);
assert.equal(
  protector.restore(protectedText.protectedText, "ru", protectedText.tokens),
  "CodeAI Hub and CodeAI"
);

const preferred = protector.protect("Project Manager", {
  category: "ui_helper_text",
  rules: [
    {
      kind: "preferred_translation",
      sourceTerm: "Project Manager",
      targetLanguage: "ru",
      translatedTerm:
        "\u041c\u0435\u043d\u0435\u0434\u0436\u0435\u0440 \u043f\u0440\u043e\u0435\u043a\u0442\u0430",
    },
  ],
  targetLanguage: "ru",
});
assert.equal(
  protector.restore(preferred.protectedText, "ru", preferred.tokens),
  "\u041c\u0435\u043d\u0435\u0434\u0436\u0435\u0440 \u043f\u0440\u043e\u0435\u043a\u0442\u0430"
);

const tempDirectory = await mkdtemp(path.join(tmpdir(), "harness-glossary-"));
try {
  const store = new UserGlossaryStore({ glossaryDirectory: tempDirectory });
  const glossaryPath = await store.ensureEditableGlossaryFile();
  assert.equal(path.basename(glossaryPath), "do-not-translate-terms.txt");
  assert.equal((await store.load()).preserve.includes("Harness AI"), true);
  assert.deepEqual(await store.save({ preserve: [" Codex ", "Codex", ""] }), {
    preserve: ["Codex"],
  });
  assert.deepEqual(await store.load(), { preserve: ["Codex"] });
} finally {
  await rm(tempDirectory, { force: true, recursive: true });
}
