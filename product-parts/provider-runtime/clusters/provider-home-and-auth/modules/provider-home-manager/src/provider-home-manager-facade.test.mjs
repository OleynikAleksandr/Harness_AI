import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = readFileSync(
  new URL("./provider-home-manager-facade.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { materializeCodexReasoningSummaryConfig, ProviderHomeManagerFacade } =
  await import(moduleUrl);

assert.equal(
  materializeCodexReasoningSummaryConfig(
    [
      'model = "gpt-5.5"',
      "[features]",
      "apps = true",
      "[hooks.state.example]",
      'model_reasoning_summary = "auto"',
      "",
    ].join("\n")
  ),
  [
    'model = "gpt-5.5"',
    'model_reasoning_summary = "detailed"',
    "[features]",
    "apps = true",
    "[hooks.state.example]",
    "",
  ].join("\n")
);

const tempDir = mkdtempSync(join(tmpdir(), "harness-provider-home-"));
const sourcePath = join(tempDir, "auth.json");
const destinationPath = join(tempDir, "home", "auth.json");
writeFileSync(sourcePath, '{"ok":true}\n', "utf8");

assert.equal(
  await new ProviderHomeManagerFacade().materializeProviderHomeFile({
    destinationPath,
    sourcePath,
    strategy: "copy-if-missing",
  }),
  true
);
assert.equal(existsSync(destinationPath), true);

rmSync(tempDir, { force: true, recursive: true });

assert.equal(
  materializeCodexReasoningSummaryConfig(
    [
      'default_reasoning_summary = "auto"',
      'model_reasoning_effort = "xhigh"',
      "",
    ].join("\n")
  ),
  [
    'model_reasoning_effort = "xhigh"',
    'model_reasoning_summary = "detailed"',
    "",
  ].join("\n")
);
