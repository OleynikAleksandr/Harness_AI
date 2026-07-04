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

const buildDir = await mkdtemp(path.join(tmpdir(), "builtin-tools-"));
const workspace = await mkdtemp(path.join(tmpdir(), "builtin-ws-"));

try {
  for (const file of [
    "builtin-tools-shared.ts",
    "builtin-tools-process.ts",
    "builtin-tools-patch.ts",
    "builtin-tools-file-exec-search.ts",
    "builtin-tools-facade.ts",
  ]) {
    writeFileSync(
      path.join(buildDir, file.replace(".ts", ".js")),
      compile(`./${file}`, import.meta.url),
      "utf8"
    );
  }
  const { createBuiltinToolSource } = await import(
    pathToFileURL(path.join(buildDir, "builtin-tools-facade.js")).href
  );

  const source = createBuiltinToolSource();
  const ctx = { workspacePath: workspace };

  // The source exposes the 7 file/exec/search descriptors under "builtin".
  assert.equal(source.source, "builtin");
  const names = source.list().map((d) => d.name);
  assert.equal(source.list().length, 7);
  assert.ok(names.includes("read_file") && names.includes("apply_patch"));

  // write_file then read_file round-trips content.
  const wrote = await source.execute(
    "write_file",
    JSON.stringify({ content: "hello", path: "a.txt" }),
    ctx
  );
  assert.match(wrote.output, /Wrote 5 bytes/);
  const read = await source.execute(
    "read_file",
    JSON.stringify({ path: "a.txt" }),
    ctx
  );
  assert.equal(read.output, "hello");

  // edit_file replaces a unique old string; a non-unique one errors.
  const edited = await source.execute(
    "edit_file",
    JSON.stringify({ new_string: "world", old_string: "hello", path: "a.txt" }),
    ctx
  );
  assert.match(edited.output, /Edited/);
  const reread = await source.execute(
    "read_file",
    JSON.stringify({ path: "a.txt" }),
    ctx
  );
  assert.equal(reread.output, "world");

  // A path escaping the workspace is rejected as a tool error, not a throw.
  const escaped = await source.execute(
    "read_file",
    JSON.stringify({ path: "../secret" }),
    ctx
  );
  assert.equal(escaped.isError, true);
  assert.match(escaped.output, /escaped the workspace/);

  // exec_command runs a shell command and returns its output.
  const exec = await source.execute(
    "exec_command",
    JSON.stringify({ cmd: "echo hi" }),
    ctx
  );
  assert.match(exec.output, /hi/);

  // apply_patch adds a file via the Codex-style envelope.
  const patch =
    "*** Begin Patch\n*** Add File: new.txt\n+line one\n*** End Patch";
  const patched = await source.execute(
    "apply_patch",
    JSON.stringify({ patch }),
    ctx
  );
  assert.match(patched.output, /Applied patch to: new\.txt/);
  const newFile = await source.execute(
    "read_file",
    JSON.stringify({ path: "new.txt" }),
    ctx
  );
  assert.equal(newFile.output.trimEnd(), "line one");

  console.log("builtin-tools tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
  await rm(workspace, { recursive: true, force: true });
}
