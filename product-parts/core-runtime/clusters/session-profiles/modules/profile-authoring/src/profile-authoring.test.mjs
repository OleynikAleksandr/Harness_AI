import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
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
    "profile-native-request-loader.ts",
    "profile-store-facade.ts",
    "seed/codeai-workflow-seed-prompts.ts",
    "seed/codex-synthetic-native-seed-prompt.ts",
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

  const missingProvider = await authoring.createProfile({
    name: "My Deep Review",
    provider: "",
  });
  assert.equal(missingProvider.ok, false);
  assert.match(missingProvider.error, /provider/u);

  // Provider-scoped profile from templates is valid by construction.
  const created = await authoring.createProfile({
    name: "My Deep Review",
    provider: "claude",
  });
  assert.equal(created.ok, true);
  assert.equal(created.id, "my-deep-review");
  const loaded = await profileStore.loadProfile("my-deep-review");
  assert.equal(loaded.ok, true);
  assert.equal(loaded.profile.scope, "individual");
  assert.equal(loaded.profile.passport.name, "My Deep Review");
  assert.equal(loaded.profile.passport.provider, "claude");
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
  const duplicate = await authoring.createProfile({
    name: "My  Deep Review",
    provider: "claude",
  });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.error, /already exists/u);
  const empty = await authoring.createProfile({
    name: "   ",
    provider: "claude",
  });
  assert.equal(empty.ok, false);
  const underivable = await authoring.createProfile({
    name: "***",
    provider: "claude",
  });
  assert.equal(underivable.ok, false);

  // Unicode names derive usable directory ids.
  assert.equal(deriveProfileId("Ревью Архитектуры"), "ревью-архитектуры");

  // Studio creation writes a provider/model Draft without opening an editor.
  const studioCreated = await authoring.createStudioDraft({
    creatorSessionId: "session-claude-studio-1",
    model: "opus",
    profileId: "draft-1234",
    provider: "claude",
  });
  assert.equal(studioCreated.ok, true);
  assert.equal(
    studioCreated.documents.profileDirectory,
    path.join(profilesRoot, "Claude", "draft-1234")
  );
  const studioDraft = await profileStore.loadProfile("draft-1234");
  assert.equal(studioDraft.ok, true);
  assert.equal(studioDraft.profile.passport.schemaVersion, 2);
  assert.equal(studioDraft.profile.passport.model, "opus");
  assert.equal(studioDraft.profile.passport.status, "draft");
  assert.equal(studioDraft.profile.passport.purpose, "");
  assert.equal(studioDraft.profile.promptBody, "");
  assert.equal(studioDraft.profile.customInstructionsBody, "");

  // Agent output is a complete snapshot and replaces all Studio documents.
  const studioUpdated = await authoring.updateStudioDraft({
    profileId: "draft-1234",
    snapshot: {
      customInstructions: "Prepare a decision-ready planning document.\n",
      description: "Planning-document workflow",
      name: "Planning Documents",
      nativeCaptureDonor: {
        artifactPath: "/captures/claude-opus.jsonl",
        captureId: "capture-1",
        modelId: "opus",
        providerId: "claude",
        requestHash: "sha256-request",
      },
      purpose: "Discuss scope and write planning evidence",
      systemPrompt: "Reduced Claude planning foundation.\n",
      tools: [{ name: "Read" }],
    },
  });
  assert.equal(studioUpdated.ok, true);
  const updatedDraft = await profileStore.loadProfile("draft-1234");
  assert.equal(updatedDraft.ok, true);
  assert.equal(updatedDraft.profile.passport.name, "Planning Documents");
  assert.equal(
    updatedDraft.profile.passport.purpose,
    "Discuss scope and write planning evidence"
  );
  assert.equal(updatedDraft.profile.passport.status, "draft");
  assert.equal(
    updatedDraft.profile.promptBody,
    "Reduced Claude planning foundation.\n"
  );
  assert.equal(
    updatedDraft.profile.customInstructionsBody,
    "Prepare a decision-ready planning document.\n"
  );
  assert.deepEqual(updatedDraft.profile.nativeRequest.tools, [
    { name: "Read" },
  ]);

  // Invalid snapshots do not mutate the last accepted full snapshot.
  const promptBeforeInvalidUpdate = readFileSync(
    updatedDraft.profile.documents.promptPath,
    "utf8"
  );
  const invalidStudioUpdate = await authoring.updateStudioDraft({
    profileId: "draft-1234",
    snapshot: {
      customInstructions: "Changed",
      description: "Changed",
      name: "   ",
      nativeCaptureDonor: null,
      purpose: "Changed",
      systemPrompt: "Changed",
      tools: null,
    },
  });
  assert.equal(invalidStudioUpdate.ok, false);
  assert.equal(
    readFileSync(updatedDraft.profile.documents.promptPath, "utf8"),
    promptBeforeInvalidUpdate
  );
  assert.deepEqual(
    (await readdir(path.join(profilesRoot, "Claude"))).filter((name) =>
      name.includes(".staging-")
    ),
    []
  );

  const unsafeStudioId = await authoring.createStudioDraft({
    creatorSessionId: "session-claude-studio-2",
    model: "opus",
    profileId: "../escape",
    provider: "claude",
  });
  assert.equal(unsafeStudioId.ok, false);

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
