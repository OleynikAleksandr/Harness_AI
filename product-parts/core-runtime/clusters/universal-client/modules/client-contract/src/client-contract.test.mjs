import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
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

const buildDir = await mkdtemp(path.join(tmpdir(), "client-contract-"));

try {
  writeFileSync(
    path.join(buildDir, "client-contract-facade.js"),
    compile("client-contract-facade.ts"),
    "utf8"
  );
  const { qualifyToolName } = await import(
    pathToFileURL(path.join(buildDir, "client-contract-facade.js")).href
  );

  // Built-in tools keep a bare name so today's set is unchanged.
  assert.equal(qualifyToolName("builtin", "read_file"), "read_file");

  // MCP tools are namespaced by server so future sources never collide.
  assert.equal(
    qualifyToolName("mcp", "pull_list", "github"),
    "mcp:github:pull_list"
  );

  // A missing server name degrades to a stable "unknown" segment, not a throw.
  assert.equal(qualifyToolName("mcp", "pull_list"), "mcp:unknown:pull_list");

  // Skill tools get their own namespace.
  assert.equal(qualifyToolName("skill", "search"), "skill:search");

  // Assistant messages can carry OpenRouter reasoning_details unchanged.
  const contractSource = readFileSync(
    new URL("./client-contract-facade.ts", import.meta.url),
    "utf8"
  );
  assert.match(
    contractSource,
    /reasoningDetails\?: readonly Readonly<Record<string, unknown>>\[\]/u
  );

  console.log("client-contract tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
