import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compilerOptions = {
  module: ts.ModuleKind.ES2022,
  target: ts.ScriptTarget.ES2022,
};
const utilsSource = readFileSync(
  new URL("./session-request-handler-runtime-utils.ts", import.meta.url),
  "utf8"
);
const utilsCompiled = ts.transpileModule(utilsSource, {
  compilerOptions,
}).outputText;
const utilsUrl = `data:text/javascript;base64,${Buffer.from(utilsCompiled).toString("base64")}`;
const source = readFileSync(
  new URL("./provider-session-id-promotion.ts", import.meta.url),
  "utf8"
).replace("./session-request-handler-runtime-utils.js", utilsUrl);
const compiled = ts.transpileModule(source, { compilerOptions }).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { readPromotedProviderSessionId } = await import(moduleUrl);

assert.equal(
  readPromotedProviderSessionId({
    payload: { newId: "real-session-123", oldId: "temp_123" },
    type: "sessionIdChanged",
  }),
  "real-session-123"
);
assert.equal(
  readPromotedProviderSessionId({
    payload: "real-session-456",
    type: "realSessionId",
  }),
  "real-session-456"
);
assert.equal(
  readPromotedProviderSessionId({
    payload: { oldId: "temp_123" },
    type: "sessionIdChanged",
  }),
  null
);
