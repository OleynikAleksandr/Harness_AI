import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function compile(file) {
  return ts.transpileModule(
    readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
}

async function writeProfile(rootDirectory, id, documents) {
  const profileDirectory = path.join(rootDirectory, id);
  await mkdir(profileDirectory, { recursive: true });
  for (const [fileName, content] of Object.entries(documents)) {
    await writeFile(path.join(profileDirectory, fileName), content, "utf8");
  }
}

// Transpiled modules must live inside the repo so the bare "yaml" import
// resolves against the project node_modules; .harness/runtime is ignored
// local state.
const buildRoot = path.join(process.cwd(), ".harness", "runtime");
await mkdir(buildRoot, { recursive: true });
const buildDirectory = await mkdtemp(
  path.join(buildRoot, "profile-store-test-")
);
const profilesRoot = await mkdtemp(path.join(tmpdir(), "harness-profiles-"));

try {
  await mkdir(path.join(buildDirectory, "seed"), { recursive: true });
  for (const file of [
    "profile-document-parser.ts",
    "profile-native-request-loader.ts",
    "profile-store-facade.ts",
    "seed/codeai-workflow-seed-prompts.ts",
    "seed/codex-synthetic-native-seed-prompt.ts",
    "seed/universal-seed-prompts.ts",
    "seed/seed-profiles.ts",
  ]) {
    await writeFile(
      path.join(buildDirectory, file.replace(/\.ts$/u, ".js")),
      compile(file),
      "utf8"
    );
  }
  const { ProfileStoreFacade, SESSION_PROFILE_TOOLING_CATEGORIES } =
    await import(
      pathToFileURL(path.join(buildDirectory, "profile-store-facade.js")).href
    );

  await writeProfile(profilesRoot, "review", {
    "profile.yaml":
      "name: Review\ndescription: Code and architecture review.\n",
    "system-prompt.md": "# Review workflow\n\nReview the change set.\n",
    "tooling.yaml": "categories:\n  file-read: on\n  shell: off\n",
  });
  await writeProfile(profilesRoot, "codeai-workflow-claude", {
    "profile.yaml":
      "name: CodeAI Workflow (Claude)\ndescription: Managed workflow.\nprovider: claude\n",
    "system-prompt.md": "Managed workflow prompt.\n",
    "tooling.yaml": "categories:\n  web: false\n",
  });
  await writeProfile(path.join(profilesRoot, "Codex"), "codex-nested", {
    "profile.yaml":
      "name: Codex Nested\ndescription: Provider-scoped profile.\nprovider: codex\n",
    "system-prompt.md": "Nested provider prompt.\n",
  });
  await writeProfile(profilesRoot, "broken-yaml", {
    "profile.yaml": "name: Broken\n",
    "system-prompt.md": "Prompt.\n",
    "tooling.yaml": "categories: [\n",
  });
  await writeProfile(profilesRoot, "unknown-category", {
    "profile.yaml": "name: Unknown Category\n",
    "system-prompt.md": "Prompt.\n",
    "tooling.yaml": "categories:\n  shall: on\n",
  });
  await writeProfile(profilesRoot, "empty-prompt", {
    "profile.yaml": "name: Empty Prompt\n",
    "system-prompt.md": "   \n",
    "tooling.yaml": "categories: {}\n",
  });
  await writeProfile(profilesRoot, "missing-tooling", {
    "profile.yaml": "name: Missing Tooling\n",
    "system-prompt.md": "Prompt.\n",
  });
  await mkdir(path.join(profilesRoot, ".hidden"), { recursive: true });

  const store = new ProfileStoreFacade({ profilesRootDirectory: profilesRoot });
  const scan = await store.listProfiles();

  assert.deepEqual(
    scan.profiles.map((profile) => profile.id),
    ["codeai-workflow-claude", "codex-nested", "review"]
  );
  assert.deepEqual(scan.invalid.map((failure) => failure.id).sort(), [
    "broken-yaml",
    "empty-prompt",
    "missing-tooling",
    "unknown-category",
  ]);

  const review = scan.profiles.find((profile) => profile.id === "review");
  assert.equal(review.scope, "universal");
  assert.equal(review.passport.name, "Review");
  assert.equal(review.tooling.categories["file-read"], true);
  assert.equal(review.tooling.categories.shell, false);
  for (const category of SESSION_PROFILE_TOOLING_CATEGORIES) {
    assert.equal(typeof review.tooling.categories[category], "boolean");
  }
  assert.equal(review.tooling.categories.web, true);

  const individual = scan.profiles.find(
    (profile) => profile.id === "codeai-workflow-claude"
  );
  assert.equal(individual.scope, "individual");
  assert.equal(individual.passport.provider, "claude");
  assert.equal(individual.tooling.categories.web, false);
  const nested = scan.profiles.find((profile) => profile.id === "codex-nested");
  assert.equal(nested.passport.provider, "codex");
  assert.equal(nested.tooling.categories.shell, true);
  assert.equal(nested.tooling.categories.web, true);
  assert.equal(
    nested.documents.profileDirectory,
    path.join(profilesRoot, "Codex", "codex-nested")
  );

  const issueText = (id) =>
    scan.invalid.find((failure) => failure.id === id).issues.join(" ");
  assert.match(issueText("broken-yaml"), /invalid YAML/u);
  assert.match(issueText("unknown-category"), /unknown category "shall"/u);
  assert.match(issueText("empty-prompt"), /prompt body is empty/u);
  assert.match(issueText("missing-tooling"), /missing or unreadable/u);

  const paths = store.resolveDocumentPaths("review");
  assert.equal(
    paths.passportPath,
    path.join(profilesRoot, "review", "profile.yaml")
  );
  assert.equal(
    paths.promptPath,
    path.join(profilesRoot, "review", "system-prompt.md")
  );
  assert.equal(
    paths.toolingPath,
    path.join(profilesRoot, "review", "tooling.yaml")
  );

  const missingRootStore = new ProfileStoreFacade({
    profilesRootDirectory: path.join(profilesRoot, "does-not-exist"),
  });
  const emptyScan = await missingRootStore.listProfiles();
  assert.deepEqual(emptyScan.profiles, []);
  assert.deepEqual(emptyScan.invalid, []);

  // Seeding: first access populates the standard set, all valid.
  const seededRoot = await mkdtemp(path.join(tmpdir(), "harness-seeded-"));
  try {
    const seededStore = new ProfileStoreFacade({
      profilesRootDirectory: seededRoot,
    });
    assert.equal(await seededStore.ensureSeededProfiles(), true);
    const seededScan = await seededStore.listProfiles();
    assert.deepEqual(seededScan.invalid, []);
    assert.deepEqual(
      seededScan.profiles.map((profile) => profile.id),
      [
        "architecture-spec",
        "codeai-workflow-claude",
        "codex-app-server-synthetic-native",
        "codex-app-server-synthetic-native-custom",
        "codex-synthetic-native",
        "codex-synthetic-native-custom",
        "plan-document",
        "review",
        "todo-plan-deterministic",
      ]
    );
    const claudeSeed = seededScan.profiles.find(
      (profile) => profile.id === "codeai-workflow-claude"
    );
    assert.equal(claudeSeed.scope, "individual");
    assert.equal(claudeSeed.passport.provider, "claude");
    const codexSeed = seededScan.profiles.find(
      (profile) => profile.id === "codex-synthetic-native"
    );
    assert.equal(codexSeed.scope, "individual");
    assert.equal(codexSeed.passport.provider, "codex-uc");
    assert.equal(
      codexSeed.documents.profileDirectory,
      path.join(seededRoot, "CodexUC", "codex-synthetic-native")
    );
    assert.equal(
      codexSeed.promptBody.startsWith("You are Codex, a coding agent"),
      true
    );
    assert.doesNotMatch(codexSeed.promptBody, /AGENTS\.md/u);
    assert.doesNotMatch(codexSeed.promptBody, /<INSTRUCTIONS>/u);
    assert.doesNotMatch(codexSeed.promptBody, /Synthetic Native/u);
    assert.doesNotMatch(codexSeed.promptBody, /Captured Codex/u);
    assert.doesNotMatch(codexSeed.promptBody, /Materialized Workspace/u);
    assert.doesNotMatch(codexSeed.promptBody, /```json/u);
    assert.equal(codexSeed.nativeRequest.inputPrefix.length, 1);
    assert.equal(codexSeed.nativeRequest.inputPrefix[0].role, "developer");
    assert.equal(codexSeed.nativeRequest.tools.length, 17);
    assert.equal(
      codexSeed.nativeRequest.requestTemplate.type,
      "response.create"
    );
    assert.equal(codexSeed.nativeRequest.customInstructions, undefined);
    const codexCustomSeed = seededScan.profiles.find(
      (profile) => profile.id === "codex-synthetic-native-custom"
    );
    assert.equal(codexCustomSeed.passport.provider, "codex-uc");
    assert.equal(
      codexCustomSeed.documents.profileDirectory,
      path.join(seededRoot, "CodexUC", "codex-synthetic-native-custom")
    );
    assert.equal(
      codexCustomSeed.promptBody.startsWith("You are Codex, a coding agent"),
      true
    );
    assert.match(
      codexCustomSeed.nativeRequest.customInstructions,
      /# Harness AI Agent Instructions/u
    );
    assert.doesNotMatch(
      codexCustomSeed.nativeRequest.customInstructions,
      /AGENTS\.md instructions for/u
    );
    assert.equal(codexCustomSeed.nativeRequest.inputPrefix.length, 1);
    assert.equal(
      codexCustomSeed.nativeRequest.inputPrefix[0].role,
      "developer"
    );
    assert.equal(codexCustomSeed.nativeRequest.tools.length, 17);
    const codexAppServerSeed = seededScan.profiles.find(
      (profile) => profile.id === "codex-app-server-synthetic-native"
    );
    assert.equal(codexAppServerSeed.scope, "individual");
    assert.equal(codexAppServerSeed.passport.provider, "codex");
    assert.equal(existsSync(codexAppServerSeed.documents.toolingPath), false);
    assert.equal(codexAppServerSeed.nativeRequest, undefined);
    assert.equal(
      codexAppServerSeed.documents.profileDirectory,
      path.join(seededRoot, "Codex", "codex-app-server-synthetic-native")
    );
    assert.equal(codexAppServerSeed.tooling.categories.shell, true);
    const codexAppServerCustomSeed = seededScan.profiles.find(
      (profile) => profile.id === "codex-app-server-synthetic-native-custom"
    );
    assert.equal(codexAppServerCustomSeed.passport.provider, "codex");
    assert.equal(
      existsSync(codexAppServerCustomSeed.documents.toolingPath),
      false
    );
    assert.equal(
      codexAppServerCustomSeed.documents.profileDirectory,
      path.join(seededRoot, "Codex", "codex-app-server-synthetic-native-custom")
    );
    assert.match(
      codexAppServerCustomSeed.nativeRequest.customInstructions,
      /# Harness AI Agent Instructions/u
    );
    assert.equal(codexAppServerCustomSeed.nativeRequest.inputPrefix, undefined);
    assert.equal(codexAppServerCustomSeed.nativeRequest.tools, undefined);
    assert.equal(
      codexAppServerCustomSeed.nativeRequest.requestTemplate,
      undefined
    );
    const reviewSeed = seededScan.profiles.find(
      (profile) => profile.id === "review"
    );
    assert.equal(reviewSeed.scope, "universal");
    assert.equal(reviewSeed.tooling.categories["file-write"], false);
    assert.equal(reviewSeed.tooling.categories.tests, true);

    // Re-seeding never overwrites user files and does not resurrect deletions.
    await writeFile(
      path.join(seededRoot, "review", "system-prompt.md"),
      "User edited.\n",
      "utf8"
    );
    await rm(path.join(seededRoot, "plan-document"), {
      force: true,
      recursive: true,
    });
    assert.equal(await seededStore.ensureSeededProfiles(), false);
    const rescanned = await seededStore.listProfiles();
    assert.equal(
      rescanned.profiles.find((profile) => profile.id === "review").promptBody,
      "User edited.\n"
    );
    assert.equal(
      rescanned.profiles.some((profile) => profile.id === "plan-document"),
      false
    );
  } finally {
    await rm(seededRoot, { force: true, recursive: true });
  }

  // Watching: file changes under the root arrive as one debounced
  // notification, and unsubscribe stops further notifications.
  const watchedRoot = await mkdtemp(path.join(tmpdir(), "harness-watch-"));
  try {
    const watchedStore = new ProfileStoreFacade({
      profilesRootDirectory: path.join(watchedRoot, "Profiles"),
    });
    let notifications = 0;
    const unsubscribe = watchedStore.watchProfiles(() => {
      notifications += 1;
    });
    const watchedProfileRoot = path.join(watchedRoot, "Profiles");
    let writeAttempt = 0;
    const deadline = Date.now() + 4000;
    while (notifications === 0 && Date.now() < deadline) {
      writeAttempt += 1;
      await writeFile(
        path.join(watchedProfileRoot, "watch-probe.txt"),
        `Changed ${writeAttempt}.\n`,
        "utf8"
      );
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 400));
    }
    assert.equal(notifications > 0, true);
    const notificationsAfterSubscribe = notifications;
    unsubscribe();
    await writeFile(
      path.join(watchedProfileRoot, "watch-probe.txt"),
      "Changed after unsubscribe.\n",
      "utf8"
    );
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    assert.equal(notifications, notificationsAfterSubscribe);

    // An unwatchable root is best-effort: no throw, unsubscribe is a no-op.
    await writeFile(path.join(watchedRoot, "blocker"), "not a dir\n", "utf8");
    const brokenStore = new ProfileStoreFacade({
      profilesRootDirectory: path.join(watchedRoot, "blocker", "Profiles"),
    });
    const brokenUnsubscribe = brokenStore.watchProfiles(() => undefined);
    brokenUnsubscribe();
  } finally {
    await rm(watchedRoot, { force: true, recursive: true });
  }

  console.log("profile-store tests: OK");
} finally {
  await rm(buildDirectory, { force: true, recursive: true });
  await rm(profilesRoot, { force: true, recursive: true });
}
