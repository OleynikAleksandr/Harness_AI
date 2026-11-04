import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
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
const {
  materializeCodexReasoningSummaryConfig,
  ProviderHomeManagerFacade,
  withRealGitConfig,
} = await import(moduleUrl);

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

// Removing a project from the app clears only its slug directories in the
// app-level provider homes.
const providersRoot = mkdtempSync(join(tmpdir(), "harness-provider-homes-"));
const projectPath = "/Users/x/VSCODE/Test_New_HarnesAI_001";
const projectSlug = "-Users-x-VSCODE-Test-New-HarnesAI-001";
const projectDirs = [
  join(providersRoot, "claude", "home", ".claude", "projects", projectSlug),
  join(
    providersRoot,
    "claude",
    "home",
    "Library",
    "Caches",
    "claude-cli-nodejs",
    projectSlug
  ),
];
const otherDir = join(
  providersRoot,
  "claude",
  "home",
  ".claude",
  "projects",
  "-Users-x-VSCODE-harness-ai"
);
for (const dir of [...projectDirs, otherDir]) {
  mkdirSync(join(dir, "memory"), { recursive: true });
}
mkdirSync(join(providersRoot, "codex", "home"), { recursive: true });
assert.deepEqual(
  (
    await new ProviderHomeManagerFacade().removeWorkspaceResidue(
      projectPath,
      providersRoot
    )
  ).sort(),
  projectDirs.slice().sort()
);
assert.equal(
  projectDirs.some((dir) => existsSync(dir)),
  false
);
assert.equal(existsSync(otherDir), true);
assert.deepEqual(
  await new ProviderHomeManagerFacade().removeWorkspaceResidue(
    "relative/path",
    providersRoot
  ),
  []
);
rmSync(providersRoot, { force: true, recursive: true });

// Agent processes with a provider HOME get the real git config.
const realHome = "/Users/real";
const realGitConfig = "/Users/real/.gitconfig";
const gitConfigExists = (filePath) => filePath === realGitConfig;
const noGitConfig = () => false;
const providerEnv = { HOME: "/Users/real/.harness-ai/providers/claude/home" };
assert.deepEqual(withRealGitConfig(providerEnv, realHome, gitConfigExists), {
  ...providerEnv,
  GIT_CONFIG_GLOBAL: realGitConfig,
});
assert.equal("GIT_CONFIG_GLOBAL" in providerEnv, false);
// Unchanged: no HOME, HOME is the real home, GIT_CONFIG_GLOBAL already set,
// or the real ~/.gitconfig does not exist.
for (const environment of [
  { PATH: "/usr/bin" },
  { HOME: "" },
  { HOME: realHome },
  { HOME: "/Users/real/" },
  { ...providerEnv, GIT_CONFIG_GLOBAL: "/custom/gitconfig" },
]) {
  assert.equal(
    withRealGitConfig(environment, realHome, gitConfigExists),
    environment
  );
}
assert.equal(
  withRealGitConfig(providerEnv, realHome, noGitConfig),
  providerEnv
);
// XDG variables are passed through untouched.
const xdgEnv = { ...providerEnv, XDG_CONFIG_HOME: "/xdg" };
assert.deepEqual(withRealGitConfig(xdgEnv, realHome, gitConfigExists), {
  ...xdgEnv,
  GIT_CONFIG_GLOBAL: realGitConfig,
});
// Defaults: the real home is os.homedir() and the file check is existsSync.
const defaultRealHome = mkdtempSync(join(tmpdir(), "harness-real-home-"));
const savedHome = process.env.HOME;
process.env.HOME = defaultRealHome;
try {
  assert.equal(withRealGitConfig(providerEnv), providerEnv);
  writeFileSync(join(defaultRealHome, ".gitconfig"), "[user]\n", "utf8");
  assert.equal(
    withRealGitConfig(providerEnv).GIT_CONFIG_GLOBAL,
    join(defaultRealHome, ".gitconfig")
  );
} finally {
  process.env.HOME = savedHome;
  rmSync(defaultRealHome, { force: true, recursive: true });
}
