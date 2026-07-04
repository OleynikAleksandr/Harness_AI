import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function compile(file, url) {
  return ts.transpileModule(readFileSync(new URL(file, url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

const buildDir = await mkdtemp(path.join(tmpdir(), "tool-registry-"));

try {
  writeFileSync(
    path.join(buildDir, "tool-registry-facade.js"),
    compile("./tool-registry-facade.ts", import.meta.url),
    "utf8"
  );
  const { createToolRegistry } = await import(
    pathToFileURL(path.join(buildDir, "tool-registry-facade.js")).href
  );

  const builtinSource = {
    execute: (qualifiedName, argumentsJson, context) =>
      Promise.resolve({
        output: `ran ${qualifiedName}(${argumentsJson}) in ${context.workspacePath}`,
      }),
    list: () => [
      {
        description: "read a file",
        name: "read_file",
        parametersSchema: {},
        qualifiedName: "read_file",
        source: "builtin",
      },
    ],
    source: "builtin",
  };

  const registry = createToolRegistry();
  registry.registerSource(builtinSource);

  // Descriptors aggregate from the source (pass-through, no filtering in MVP).
  const descriptors = registry.listDescriptors();
  assert.equal(descriptors.length, 1);
  assert.equal(descriptors[0].qualifiedName, "read_file");

  // A known tool routes to its owning source.
  const ok = await registry.execute("read_file", '{"path":"a"}', {
    workspacePath: "/ws",
  });
  assert.equal(ok.output, 'ran read_file({"path":"a"}) in /ws');
  assert.equal(ok.isError, undefined);

  // An unknown tool returns an error result, not a throw.
  const bad = await registry.execute("nope", "{}", { workspacePath: "/ws" });
  assert.equal(bad.isError, true);
  assert.match(bad.output, /Unknown tool: nope/);

  console.log("tool-registry tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
