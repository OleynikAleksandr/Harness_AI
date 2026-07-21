import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const STORE_SRC = new URL(
  "../../../../session-profiles/modules/profile-store/src/",
  import.meta.url
);
const AUTHORING_SRC = new URL(
  "../../../../session-profiles/modules/profile-authoring/src/",
  import.meta.url
);
const MATERIALIZER_SRC = new URL(
  "../../../../session-profiles/modules/profile-materializer/src/",
  import.meta.url
);

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
  path.join(buildRoot, "profile-studio-lifecycle-test-")
);
const profilesRoot = await mkdtemp(
  path.join(tmpdir(), "harness-profile-studio-")
);

try {
  const storeBuild = path.join(buildDirectory, "profile-store", "src");
  const authoringBuild = path.join(buildDirectory, "profile-authoring", "src");
  await mkdir(storeBuild, { recursive: true });
  await mkdir(authoringBuild, { recursive: true });
  for (const file of [
    "profile-document-parser.ts",
    "profile-native-request-loader.ts",
    "profile-store-facade.ts",
  ]) {
    await writeFile(
      path.join(storeBuild, file.replace(/\.ts$/u, ".js")),
      compile(new URL(file, STORE_SRC)),
      "utf8"
    );
  }
  await writeFile(
    path.join(authoringBuild, "profile-authoring-facade.js"),
    compile(new URL("profile-authoring-facade.ts", AUTHORING_SRC)),
    "utf8"
  );

  const { ProfileStoreFacade } = await import(
    pathToFileURL(path.join(storeBuild, "profile-store-facade.js")).href
  );
  const { ProfileAuthoringFacade } = await import(
    pathToFileURL(path.join(authoringBuild, "profile-authoring-facade.js")).href
  );
  const { ProfileMaterializerFacade } = await import(
    `data:text/javascript;base64,${Buffer.from(
      compile(new URL("profile-materializer-facade.ts", MATERIALIZER_SRC))
    ).toString("base64")}`
  );
  const { ProfileStudioLifecycleFacade } = await import(
    `data:text/javascript;base64,${Buffer.from(
      compile(new URL("profile-studio-lifecycle-facade.ts", import.meta.url))
    ).toString("base64")}`
  );

  const profileStore = new ProfileStoreFacade({
    profilesRootDirectory: profilesRoot,
  });
  const profileAuthoring = new ProfileAuthoringFacade({ profileStore });
  const profileMaterializer = new ProfileMaterializerFacade();
  const lifecycle = new ProfileStudioLifecycleFacade({
    idFactory: () => "abc123",
    profileAuthoring,
    profileMaterializer,
    profileStore,
  });

  const created = await lifecycle.createDraft({
    creatorSessionId: "session-creator-1",
    modelId: "opus",
    providerId: "claude",
  });
  assert.equal(created.ok, true);
  assert.equal(created.profile.profileId, "draft-abc123");
  assert.equal(created.profile.lifecycleStatus, "draft");
  assert.deepEqual(created.profile.target, {
    modelId: "opus",
    providerId: "claude",
  });
  assert.equal(created.profile.approvedContentHash, null);
  assert.equal(
    await lifecycle.getProfileIdForCreatorSession("session-creator-1"),
    "draft-abc123"
  );

  const incompleteApproval = await lifecycle.approveDraft({
    contentHash: created.profile.contentHash,
    profileId: created.profile.profileId,
  });
  assert.equal(incompleteApproval.ok, false);
  assert.match(incompleteApproval.error, /Both Studio prompt parts/u);

  const firstSnapshot = await lifecycle.applyDraftSnapshot({
    profileId: created.profile.profileId,
    snapshot: {
      customInstructions: "Produce a decision-ready planning document.\n",
      description: "Planning-document work",
      name: "Planning Documents",
      nativeCaptureDonor: {
        artifactPath: "/captures/claude-opus.jsonl",
        captureId: "capture-1",
        modelId: "opus",
        providerId: "claude",
        requestHash: "sha256-request",
      },
      purpose: "Discuss scope and prepare planning evidence",
      systemPrompt: "Reduced native planning foundation.\n",
      tools: [{ name: "Read" }],
    },
  });
  assert.equal(firstSnapshot.ok, true);
  assert.equal(firstSnapshot.profile.lifecycleStatus, "draft");
  assert.equal(firstSnapshot.profile.creatorSessionId, "session-creator-1");

  const staleApproval = await lifecycle.approveDraft({
    contentHash: created.profile.contentHash,
    profileId: created.profile.profileId,
  });
  assert.equal(staleApproval.ok, false);
  assert.match(staleApproval.error, /content changed/u);

  const approved = await lifecycle.approveDraft({
    contentHash: firstSnapshot.profile.contentHash,
    profileId: created.profile.profileId,
  });
  assert.equal(approved.ok, true);
  assert.equal(approved.profile.lifecycleStatus, "valid");
  assert.equal(
    approved.profile.approvedContentHash,
    firstSnapshot.profile.contentHash
  );
  assert.ok(approved.profile.approvedAt);

  const edited = await lifecycle.applyDraftSnapshot({
    profileId: created.profile.profileId,
    snapshot: {
      customInstructions: "Use the revised planning workflow.\n",
      description: "Revised planning-document work",
      name: "Planning Documents",
      nativeCaptureDonor: approved.profile.nativeCaptureDonor,
      purpose: "Discuss scope and prepare revised planning evidence",
      systemPrompt: "Reduced native planning foundation.\n",
      tools: [{ name: "Read" }],
    },
  });
  assert.equal(edited.ok, true);
  assert.equal(edited.profile.lifecycleStatus, "draft");
  assert.equal(edited.profile.approvedContentHash, null);
  assert.notEqual(edited.profile.contentHash, approved.profile.contentHash);
  assert.deepEqual(edited.profile.target, approved.profile.target);
  assert.equal(
    edited.profile.creatorSessionId,
    approved.profile.creatorSessionId
  );

  // A fresh facade restores the profile/session binding from disk.
  const restoredLifecycle = new ProfileStudioLifecycleFacade({
    profileAuthoring,
    profileMaterializer,
    profileStore,
  });
  const restored = await restoredLifecycle.getProfile("draft-abc123");
  assert.equal(restored.ok, true);
  assert.equal(restored.profile.lifecycleStatus, "draft");
  assert.equal(
    await restoredLifecycle.getProfileIdForCreatorSession("session-creator-1"),
    "draft-abc123"
  );

  const legacyProfile = await profileAuthoring.createProfile({
    name: "Legacy Keep",
    provider: "claude",
  });
  assert.equal(legacyProfile.ok, true);
  const rejectedLegacyDelete =
    await restoredLifecycle.deleteProfile("legacy-keep");
  assert.equal(rejectedLegacyDelete.ok, false);
  assert.equal((await profileStore.loadProfile("legacy-keep")).ok, true);

  const deleted = await restoredLifecycle.deleteProfile("draft-abc123");
  assert.deepEqual(deleted, {
    creatorSessionId: "session-creator-1",
    ok: true,
    profileId: "draft-abc123",
  });
  assert.equal((await restoredLifecycle.getProfile("draft-abc123")).ok, false);

  console.log("profile-studio-lifecycle tests: OK");
} finally {
  await rm(buildDirectory, { force: true, recursive: true });
  await rm(profilesRoot, { force: true, recursive: true });
}
