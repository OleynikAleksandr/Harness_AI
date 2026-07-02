import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  await writeFile(
    path.join(buildDirectory, "profile-document-parser.js"),
    compile("profile-document-parser.ts"),
    "utf8"
  );
  await writeFile(
    path.join(buildDirectory, "profile-store-facade.js"),
    compile("profile-store-facade.ts"),
    "utf8"
  );
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
    ["codeai-workflow-claude", "review"]
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

  console.log("profile-store tests: OK");
} finally {
  await rm(buildDirectory, { force: true, recursive: true });
  await rm(profilesRoot, { force: true, recursive: true });
}
