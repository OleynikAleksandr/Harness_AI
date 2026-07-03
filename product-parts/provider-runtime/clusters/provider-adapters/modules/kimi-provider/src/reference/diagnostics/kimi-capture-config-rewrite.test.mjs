import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const buildDir = await mkdtemp(
  path.join(tmpdir(), "kimi-config-rewrite-test-")
);

try {
  const compiled = ts.transpileModule(
    readFileSync(
      new URL("./kimi-capture-config-rewrite.ts", import.meta.url),
      "utf8"
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  writeFileSync(
    path.join(buildDir, "kimi-capture-config-rewrite.js"),
    compiled,
    "utf8"
  );
  const { rewriteKimiProviderBaseUrls } = await import(
    pathToFileURL(path.join(buildDir, "kimi-capture-config-rewrite.js")).href
  );

  const CONFIG = [
    'default_model = "kimi-for-coding"',
    "",
    "[services.moonshot_search]",
    'base_url = "https://api.kimi.com/coding/v1/search"',
    'api_key = "sk-search"',
    "",
    "[providers.kimi-for-coding]",
    'type = "kimi"',
    'base_url = "https://api.kimi.com/coding/v1"',
    'api_key = "sk-secret"',
  ].join("\n");

  // The provider base_url is redirected to the bridge, PRESERVING the URL path
  // (`/coding/v1`) so `/coding/v1/chat/completions` still routes.
  {
    const rewritten = rewriteKimiProviderBaseUrls(
      CONFIG,
      "http://127.0.0.1:54321"
    );
    assert.match(
      rewritten,
      /\[providers\.kimi-for-coding\][\s\S]*base_url = "http:\/\/127\.0\.0\.1:54321\/coding\/v1"/u
    );
    // The search service URL under [services.*] is left untouched.
    assert.match(
      rewritten,
      /base_url = "https:\/\/api\.kimi\.com\/coding\/v1\/search"/u
    );
    // Credentials are preserved.
    assert.match(rewritten, /api_key = "sk-secret"/u);
  }

  // A trailing slash on the bridge URL does not produce a double slash.
  {
    const rewritten = rewriteKimiProviderBaseUrls(
      CONFIG,
      "http://127.0.0.1:9/"
    );
    assert.match(
      rewritten,
      /base_url = "http:\/\/127\.0\.0\.1:9\/coding\/v1"/u
    );
  }

  console.log("kimi-capture-config-rewrite tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
