import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./sdk-executable-path.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { resolveClaudeAgentSdkExecutablePath } = await import(moduleUrl);

assert.equal(
  resolveClaudeAgentSdkExecutablePath({
    arch: "arm64",
    moduleDirectory: "/tmp/sdk/lib/node_modules/@anthropic-ai/claude-agent-sdk",
    npmPrefix: "/tmp/sdk",
    platform: "darwin",
  }),
  "/tmp/sdk/lib/node_modules/@anthropic-ai/claude-agent-sdk/node_modules/@anthropic-ai/claude-agent-sdk-darwin-arm64/claude"
);
assert.equal(
  resolveClaudeAgentSdkExecutablePath({
    arch: "riscv64",
    moduleDirectory: "/tmp/sdk/lib/node_modules/@anthropic-ai/claude-agent-sdk",
    npmPrefix: "/tmp/sdk",
    platform: "linux",
  }),
  "/tmp/sdk/bin/claude"
);
