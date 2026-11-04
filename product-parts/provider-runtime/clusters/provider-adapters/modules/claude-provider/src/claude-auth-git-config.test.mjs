import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// The Claude auth environment (SDK sessions, CLI login/probe, request capture,
// translation) keeps the provider HOME but points git at the real
// ~/.gitconfig through GIT_CONFIG_GLOBAL.
const HOME_MANAGER_IMPORT =
  "../../../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
const root = mkdtempSync(path.join(tmpdir(), "claude-auth-git-config-"));
const buildDir = path.join(root, "build");
const compile = (sourceUrl, targetPath) => {
  const compiled = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(
    targetPath,
    compiled.replaceAll(
      HOME_MANAGER_IMPORT,
      "../../provider-home-manager-facade.js"
    ),
    "utf8"
  );
};
compile(
  new URL(
    "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts",
    import.meta.url
  ),
  path.join(buildDir, "provider-home-manager-facade.js")
);
for (const filename of [
  "auth/claude-auth-runtime.ts",
  "sdk/claude-oauth-token-reader.ts",
  "sdk/claude-provider-home.ts",
]) {
  compile(
    new URL(`./reference/${filename}`, import.meta.url),
    path.join(buildDir, "reference", filename.replace(/\.ts$/u, ".js"))
  );
}

const realHome = path.join(root, "real-home");
const providerHome = path.join(root, "provider-home");
mkdirSync(realHome, { recursive: true });
const saved = {
  GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
  HARNESS_CLAUDE_HOME: process.env.HARNESS_CLAUDE_HOME,
  HOME: process.env.HOME,
};
process.env.HOME = realHome;
process.env.HARNESS_CLAUDE_HOME = providerHome;
Reflect.deleteProperty(process.env, "GIT_CONFIG_GLOBAL");
try {
  const { ClaudeAuthRuntime } = await import(
    pathToFileURL(
      path.join(buildDir, "reference", "auth", "claude-auth-runtime.js")
    ).href
  );
  const runtime = new ClaudeAuthRuntime();

  // No real ~/.gitconfig: nothing is added.
  const withoutConfig = runtime.getAuthEnvironment();
  assert.equal(withoutConfig.HOME, providerHome);
  assert.equal("GIT_CONFIG_GLOBAL" in withoutConfig, false);

  writeFileSync(path.join(realHome, ".gitconfig"), "[user]\n", "utf8");
  const withConfig = runtime.getAuthEnvironment();
  assert.equal(withConfig.HOME, providerHome);
  assert.equal(withConfig.GIT_CONFIG_GLOBAL, path.join(realHome, ".gitconfig"));
  assert.equal(withConfig.CLAUDE_USE_CLI_AUTH, "true");

  // A user-provided GIT_CONFIG_GLOBAL wins.
  process.env.GIT_CONFIG_GLOBAL = "/custom/gitconfig";
  assert.equal(
    runtime.getAuthEnvironment().GIT_CONFIG_GLOBAL,
    "/custom/gitconfig"
  );
  console.log("claude auth git config tests passed");
} finally {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = value;
    }
  }
  rmSync(root, { force: true, recursive: true });
}
