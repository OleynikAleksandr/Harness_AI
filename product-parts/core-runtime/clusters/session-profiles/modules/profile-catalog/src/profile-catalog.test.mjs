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
  path.join(buildRoot, "profile-catalog-test-")
);
const profilesRoot = await mkdtemp(path.join(tmpdir(), "harness-catalog-"));

async function writeStudioProfile({ id, model, provider = "claude", status }) {
  const providerDirectory = provider === "kimi-client" ? "Kimi" : "Claude";
  const profileDirectory = path.join(profilesRoot, providerDirectory, id);
  await mkdir(profileDirectory, { recursive: true });
  await writeFile(
    path.join(profileDirectory, "profile.yaml"),
    [
      "schemaVersion: 2",
      "authoring: profile-studio",
      `name: ${id}`,
      "description: Studio catalog profile.",
      `purpose: Purpose for ${id}`,
      `provider: ${provider}`,
      `model: ${model}`,
      `status: ${status}`,
      `creatorSessionId: session-${id}`,
      "nativeCaptureDonor: null",
      "",
    ].join("\n"),
    "utf8"
  );
  if (status === "valid") {
    await writeFile(
      path.join(profileDirectory, "system-prompt.md"),
      `Foundation for ${id}.\n`,
      "utf8"
    );
    await writeFile(
      path.join(profileDirectory, "custom-instructions.md"),
      `Custom instructions for ${id}.\n`,
      "utf8"
    );
  }
}

try {
  await mkdir(path.join(buildDirectory, "profile-store", "src", "seed"), {
    recursive: true,
  });
  await mkdir(path.join(buildDirectory, "profile-catalog", "src"), {
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
      "profile-catalog",
      "src",
      "profile-catalog-facade.js"
    ),
    compile(new URL("./profile-catalog-facade.ts", import.meta.url)),
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
  const { NATIVE_SESSION_PROFILE_ID, ProfileCatalogFacade } = await import(
    pathToFileURL(
      path.join(
        buildDirectory,
        "profile-catalog",
        "src",
        "profile-catalog-facade.js"
      )
    ).href
  );

  const profileStore = new ProfileStoreFacade({
    profilesRootDirectory: profilesRoot,
  });
  const catalog = new ProfileCatalogFacade({ profileStore });

  await profileStore.ensureSeededProfiles();
  await writeStudioProfile({
    id: "draft-opus",
    model: "opus",
    status: "draft",
  });
  await writeStudioProfile({
    id: "valid-opus",
    model: "opus",
    status: "valid",
  });
  await writeStudioProfile({
    id: "valid-sonnet",
    model: "sonnet",
    status: "valid",
  });
  await writeStudioProfile({
    id: "invalidly-valid-kimi",
    model: "k3",
    provider: "kimi-client",
    status: "valid",
  });
  await mkdir(path.join(profilesRoot, "review"), { recursive: true });
  await writeFile(
    path.join(profilesRoot, "review", "profile.yaml"),
    "name: Review\ndescription: Legacy universal review profile.\n",
    "utf8"
  );
  await writeFile(
    path.join(profilesRoot, "review", "system-prompt.md"),
    "Review the change set.\n",
    "utf8"
  );
  await writeFile(
    path.join(profilesRoot, "review", "tooling.yaml"),
    "categories:\n  file-read: on\n  shell: on\n",
    "utf8"
  );
  const grokProfileDirectory = path.join(profilesRoot, "Grok", "grok-review");
  await mkdir(grokProfileDirectory, { recursive: true });
  await writeFile(
    path.join(grokProfileDirectory, "profile.yaml"),
    "name: Grok Review\ndescription: Managed Grok review.\nprovider: grok\n",
    "utf8"
  );
  await writeFile(
    path.join(grokProfileDirectory, "system-prompt.md"),
    "Review the change set with Grok.\n",
    "utf8"
  );
  await writeFile(
    path.join(grokProfileDirectory, "tooling.yaml"),
    "categories:\n  file-read: on\n  shell: on\n",
    "utf8"
  );

  // Listing puts Native first and filters out legacy universal profiles.
  const claudeEntries = await catalog.listProfilesForProvider("claude");
  assert.equal(claudeEntries[0].id, NATIVE_SESSION_PROFILE_ID);
  assert.equal(claudeEntries[0].kind, "native");
  const claudeIds = claudeEntries.map((entry) => entry.id);
  assert.ok(!claudeIds.includes("review"));
  assert.ok(claudeIds.includes("codeai-workflow-claude"));
  assert.ok(!claudeIds.includes("codeai-workflow-kimi"));
  assert.ok(!claudeIds.includes("codeai-workflow-glm-native"));
  assert.ok(!claudeIds.includes("draft-opus"));
  assert.ok(!claudeIds.includes("valid-opus"));

  // Studio listing is exact provider/model and excludes Native/legacy data.
  const opusStudioEntries = await catalog.listStudioProfilesForTarget({
    modelId: "opus",
    providerId: "claude",
  });
  assert.deepEqual(
    opusStudioEntries.map((entry) => [entry.id, entry.status]),
    [
      ["draft-opus", "draft"],
      ["valid-opus", "valid"],
    ]
  );
  assert.ok(
    opusStudioEntries.every(
      (entry) => entry.provider === "claude" && entry.model === "opus"
    )
  );
  const sonnetStudioEntries = await catalog.listStudioProfilesForTarget({
    modelId: "sonnet",
    providerId: "claude",
  });
  assert.deepEqual(
    sonnetStudioEntries.map((entry) => entry.id),
    ["valid-sonnet"]
  );
  const codexStudioEntries = await catalog.listStudioProfilesForTarget({
    modelId: "opus",
    providerId: "codex",
  });
  assert.deepEqual(codexStudioEntries, []);

  // Ordinary picker admits only Valid Studio entries for the exact model.
  const claudeOpusPicker = await catalog.listProfilesForProvider(
    "claude",
    "opus"
  );
  assert.ok(claudeOpusPicker.some((entry) => entry.id === "valid-opus"));
  assert.ok(!claudeOpusPicker.some((entry) => entry.id === "draft-opus"));
  assert.ok(!claudeOpusPicker.some((entry) => entry.id === "valid-sonnet"));

  const codexEntries = await catalog.listProfilesForProvider("codex");
  const codexIds = codexEntries.map((entry) => entry.id);
  assert.ok(!codexIds.includes("review"));
  assert.ok(codexIds.includes("codex-app-server-synthetic-native"));
  assert.ok(codexIds.includes("codex-app-server-synthetic-native-custom"));
  assert.ok(!codexIds.includes("codex-synthetic-native"));
  assert.ok(!codexIds.includes("codeai-workflow-claude"));

  const grokEntries = await catalog.listProfilesForProvider("grok");
  assert.deepEqual(
    grokEntries.map((entry) => entry.id),
    [NATIVE_SESSION_PROFILE_ID, "grok-review"]
  );

  // Providers with no matching provider-scoped profiles still get Native.
  const openrouterEntries =
    await catalog.listProfilesForProvider("openrouter-client");
  assert.deepEqual(
    openrouterEntries.map((entry) => entry.id),
    [NATIVE_SESSION_PROFILE_ID]
  );
  const kimiEntries = await catalog.listProfilesForProvider("kimi-client");
  assert.deepEqual(
    kimiEntries.map((entry) => entry.id),
    [NATIVE_SESSION_PROFILE_ID]
  );
  const kimiK3Entries = await catalog.listProfilesForProvider(
    "kimi-client",
    "k3"
  );
  assert.deepEqual(
    kimiK3Entries.map((entry) => entry.id),
    [NATIVE_SESSION_PROFILE_ID]
  );

  // Broken profiles appear in the management list with their issues.
  await mkdir(path.join(profilesRoot, "broken"), { recursive: true });
  await writeFile(
    path.join(profilesRoot, "broken", "profile.yaml"),
    "name: Broken\n",
    "utf8"
  );
  const allEntries = await catalog.listAllProfiles();
  const broken = allEntries.find((entry) => entry.id === "broken");
  assert.equal(broken.valid, false);
  assert.ok(broken.issues.length > 0);

  // Resolution: no selection and explicit native resolve to Native.
  const noSelection = await catalog.resolveForSession({ providerId: "claude" });
  assert.deepEqual(noSelection, { kind: "native", ok: true });
  const explicitNative = await catalog.resolveForSession({
    profileId: "native",
    providerId: "openrouter-client",
  });
  assert.deepEqual(explicitNative, { kind: "native", ok: true });

  // Provider-scoped managed resolution returns the loaded profile.
  const managed = await catalog.resolveForSession({
    profileId: "codex-app-server-synthetic-native",
    providerId: "codex",
  });
  assert.equal(managed.ok, true);
  assert.equal(managed.kind, "managed");
  assert.equal(managed.profile.id, "codex-app-server-synthetic-native");

  const grokManaged = await catalog.resolveForSession({
    profileId: "grok-review",
    providerId: "grok",
  });
  assert.equal(grokManaged.ok, true);
  assert.equal(grokManaged.kind, "managed");
  assert.equal(grokManaged.profile.passport.provider, "grok");

  const studioWithoutModel = await catalog.resolveForSession({
    profileId: "valid-opus",
    providerId: "claude",
  });
  assert.equal(studioWithoutModel.ok, false);
  assert.match(studioWithoutModel.error, /requires that exact model/u);
  const studioWrongModel = await catalog.resolveForSession({
    modelId: "sonnet",
    profileId: "valid-opus",
    providerId: "claude",
  });
  assert.equal(studioWrongModel.ok, false);
  const studioDraftResolution = await catalog.resolveForSession({
    modelId: "opus",
    profileId: "draft-opus",
    providerId: "claude",
  });
  assert.equal(studioDraftResolution.ok, false);
  assert.match(studioDraftResolution.error, /Draft/u);
  const studioManaged = await catalog.resolveForSession({
    modelId: "opus",
    profileId: "valid-opus",
    providerId: "claude",
  });
  assert.equal(studioManaged.ok, true);
  assert.equal(studioManaged.kind, "managed");

  const legacyUniversal = await catalog.resolveForSession({
    profileId: "review",
    providerId: "codex",
  });
  assert.equal(legacyUniversal.ok, false);
  assert.match(legacyUniversal.error, /legacy universal/u);

  // Selected but broken/inapplicable/missing profiles are structured errors.
  const brokenResolution = await catalog.resolveForSession({
    profileId: "broken",
    providerId: "claude",
  });
  assert.equal(brokenResolution.ok, false);
  assert.match(brokenResolution.error, /cannot be applied/u);

  const inapplicable = await catalog.resolveForSession({
    profileId: "codeai-workflow-claude",
    providerId: "codex",
  });
  assert.equal(inapplicable.ok, false);
  assert.match(inapplicable.error, /not applicable/u);

  const codexSynthetic = await catalog.resolveForSession({
    profileId: "codex-app-server-synthetic-native",
    providerId: "codex",
  });
  assert.equal(codexSynthetic.ok, true);
  assert.equal(codexSynthetic.kind, "managed");
  assert.equal(codexSynthetic.profile.passport.provider, "codex");

  const kimiManaged = await catalog.resolveForSession({
    profileId: "review",
    providerId: "kimi-client",
  });
  assert.equal(kimiManaged.ok, false);
  assert.match(kimiManaged.error, /legacy universal/u);
  const invalidlyValidKimiStudio = await catalog.resolveForSession({
    modelId: "k3",
    profileId: "invalidly-valid-kimi",
    providerId: "kimi-client",
  });
  assert.equal(invalidlyValidKimiStudio.ok, false);
  assert.match(invalidlyValidKimiStudio.error, /Draft-only/u);
  assert.match(invalidlyValidKimiStudio.error, /25\/25/u);

  const missing = await catalog.resolveForSession({
    profileId: "does-not-exist",
    providerId: "claude",
  });
  assert.equal(missing.ok, false);
  assert.match(missing.error, /cannot be applied/u);

  const unsupported = await catalog.resolveForSession({
    profileId: "codeai-workflow-claude",
    providerId: "retired-provider",
  });
  assert.equal(unsupported.ok, false);
  assert.match(unsupported.error, /does not support managed session profiles/u);

  console.log("profile-catalog tests: OK");
} finally {
  await rm(buildDirectory, { force: true, recursive: true });
  await rm(profilesRoot, { force: true, recursive: true });
}
