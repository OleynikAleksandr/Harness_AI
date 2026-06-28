import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = readFileSync(
  new URL("./kimi-model-env.ts", import.meta.url),
  "utf8"
);
const providerSource = readFileSync(
  new URL("./kimi-provider-facade.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { buildKimiModelEnvironment } = await import(moduleUrl);

const tempDir = mkdtempSync(join(tmpdir(), "harness-kimi-env-"));
const configPath = join(tempDir, "config.toml");

try {
  writeFileSync(
    configPath,
    [
      "[providers.kimi-for-coding]",
      'type = "kimi"',
      'base_url = "https://api.kimi.com/coding/v1"',
      'api_key = "test-api-key"',
      "",
    ].join("\n"),
    "utf8"
  );

  const env = buildKimiModelEnvironment("kimi-k2.7-code", configPath);
  assert.equal(env.KIMI_MODEL_NAME, "kimi-k2.7-code");
  assert.equal(env.KIMI_MODEL_API_KEY, "test-api-key");
  assert.equal(env.KIMI_MODEL_MAX_CONTEXT_SIZE, "262144");
  assert.equal(env.KIMI_MODEL_PROVIDER_TYPE, "kimi");
  assert.equal(buildKimiModelEnvironment("cli-default", configPath), null);
  assert.match(providerSource, /workspacePath \?\?/u);
  assert.match(providerSource, /"--output-format", "stream-json"/u);
  assert.match(providerSource, /outputParser: "kimi-stream-json"/u);
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
