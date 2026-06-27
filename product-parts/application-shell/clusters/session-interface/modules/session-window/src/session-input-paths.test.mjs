import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-input-paths.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { formatPathsForInsertion, normalizePathCandidate } = await import(
  moduleUrl
);

assert.equal(
  normalizePathCandidate("file:///Users/me/My%20File.md"),
  "/Users/me/My File.md"
);
assert.equal(normalizePathCandidate("/Users/me/file.md"), "/Users/me/file.md");
assert.equal(normalizePathCandidate("../notes.md"), "../notes.md");
assert.equal(normalizePathCandidate("not a path"), null);
assert.equal(
  formatPathsForInsertion(["/tmp/a.md", "/tmp/b.md"]),
  '"/tmp/a.md"\n"/tmp/b.md"\n'
);
