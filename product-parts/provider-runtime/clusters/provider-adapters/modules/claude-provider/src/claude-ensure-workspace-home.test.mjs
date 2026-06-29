import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

globalThis.__claudeHomeCalls = [];
const source = readFileSync(
  new URL("./claude-provider-facade.ts", import.meta.url),
  "utf8"
).replace(
  /import \{[\s\S]*?ClaudeUsageLimitsStreamPayload,[\s\S]*?\} from "\.\/reference\/index\.js";\n/u,
  "class ClaudeProviderAdapter { constructor(options) { this.options = options; } }\n"
);
const testSource = [
  'const path = { join: (...parts) => parts.join("/") };',
  'const homedir = () => "/home/test";',
  "const readClaudeUsageLimitsPayload = () => null;",
  'const providerHomeManagerFacade = { resolveProviderHome: ({ providerId, workspacePath }) => workspacePath + "/.harness/runtime/providers/" + providerId + "/home" };',
  "const ensureClaudeProviderHomeAuthFiles = async (providerHomePath) => globalThis.__claudeHomeCalls.push(providerHomePath);",
  source,
].join("\n");
const compiled = ts.transpileModule(testSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { ClaudeProviderFacade } = await import(moduleUrl);

const facade = new ClaudeProviderFacade();
await facade.ensureWorkspaceHome("/tmp/workspace-a");
await facade.ensureWorkspaceHome("/tmp/workspace-a");

assert.deepEqual(globalThis.__claudeHomeCalls, [
  "/tmp/workspace-a/.harness/runtime/providers/claude/home",
  "/tmp/workspace-a/.harness/runtime/providers/claude/home",
]);
globalThis.__claudeHomeCalls = undefined;
