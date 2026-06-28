import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const { materializeCodexReasoningSummaryConfig } = await import(moduleUrl);

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
    'model_reasoning_summary = "none"',
    "[features]",
    "apps = true",
    "[hooks.state.example]",
    "",
  ].join("\n")
);

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
    'model_reasoning_summary = "none"',
    "",
  ].join("\n")
);
