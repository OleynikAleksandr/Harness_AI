import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const STORE_SRC = new URL("../../profile-store/src/", import.meta.url);

function compile(sourceUrl) {
  return ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

const buildRoot = path.join(process.cwd(), ".harness", "runtime");
await mkdir(buildRoot, { recursive: true });
const buildDirectory = await mkdtemp(
  path.join(buildRoot, "profile-authoring-test-")
);
const profilesRoot = await mkdtemp(path.join(tmpdir(), "harness-authoring-"));

try {
  await mkdir(path.join(buildDirectory, "profile-store", "src", "seed"), {
    recursive: true,
  });
  await mkdir(path.join(buildDirectory, "profile-authoring", "src"), {
    recursive: true,
  });
  const storeFiles = [
    "profile-document-parser.ts",
    "profile-store-facade.ts",
    "seed/codeai-workflow-seed-prompts.ts",
    "seed/codex-synthetic-native-seed-prompt.ts",
    "seed/universal-seed-prompts.ts",
    "seed/seed-profiles.ts",
  ];
  for (const file of storeFiles) {
    await writeFile(
      path.join(
        buildDirectory,
        "profile-store",
        "src",
        file.replace(/\.ts$/u, ".js")
      ),
      compile(new URL(file, STORE_SRC)),
      "utf8"
    );
  }
  await writeFile(
    path.join(
      buildDirectory,
      "profile-authoring",
      "src",
      "profile-authoring-facade.js"
    ),
    compile(new URL("./profile-authoring-facade.ts", import.meta.url)),
    "utf8"
  );

  const { ProfileStoreFacade } = await import(
    pathToFileURL(
      path.join(
        buildDirectory,
        "profile-store",
        "src",
        "profile-store-facade.js"
      )
    ).href
  );
  const { ProfileAuthoringFacade, deriveProfileId } = await import(
    pathToFileURL(
      path.join(
        buildDirectory,
        "profile-authoring",
        "src",
        "profile-authoring-facade.js"
      )
    ).href
  );

  const profileStore = new ProfileStoreFacade({
    profilesRootDirectory: profilesRoot,
  });
  const authoring = new ProfileAuthoringFacade({ profileStore });

  // Universal profile from templates is valid by construction.
  const created = await authoring.createProfile({ name: "My Deep Review" });
  assert.equal(created.ok, true);
  assert.equal(created.id, "my-deep-review");
  const loaded = await profileStore.loadProfile("my-deep-review");
  assert.equal(loaded.ok, true);
  assert.equal(loaded.profile.scope, "universal");
  assert.equal(loaded.profile.passport.name, "My Deep Review");
  assert.equal(loaded.profile.tooling.categories.shell, true);
  assert.match(loaded.profile.promptBody, /action categories/u);

  // Individual profile records the provider and becomes provider-scoped.
  const individual = await authoring.createProfile({
    name: "Codex Patcher",
    provider: "codex",
  });
  assert.equal(individual.ok, true);
  const individualLoaded = await profileStore.loadProfile("codex-patcher");
  assert.equal(individualLoaded.ok, true);
  assert.equal(individualLoaded.profile.scope, "individual");
  assert.equal(individualLoaded.profile.passport.provider, "codex");

  // Duplicate ids and empty/underivable names are structured errors.
  const duplicate = await authoring.createProfile({ name: "My  Deep Review" });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.error, /already exists/u);
  const empty = await authoring.createProfile({ name: "   " });
  assert.equal(empty.ok, false);
  const underivable = await authoring.createProfile({ name: "***" });
  assert.equal(underivable.ok, false);

  // Unicode names derive usable directory ids.
  assert.equal(deriveProfileId("Ревью Архитектуры"), "ревью-архитектуры");

  // Editor paths delegate to the store layout.
  const paths = authoring.resolveDocumentPaths("my-deep-review");
  assert.equal(
    paths.promptPath,
    path.join(profilesRoot, "my-deep-review", "system-prompt.md")
  );

  console.log("profile-authoring tests: OK");
} finally {
  await rm(buildDirectory, { force: true, recursive: true });
  await rm(profilesRoot, { force: true, recursive: true });
}
