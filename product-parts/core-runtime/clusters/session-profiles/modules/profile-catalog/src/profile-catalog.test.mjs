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

try {
  await mkdir(path.join(buildDirectory, "profile-store", "src", "seed"), {
    recursive: true,
  });
  await mkdir(path.join(buildDirectory, "profile-catalog", "src"), {
    recursive: true,
  });
  const storeFiles = [
    "profile-document-parser.ts",
    "profile-store-facade.ts",
    "seed/codeai-workflow-kimi-baseline.ts",
    "seed/codeai-workflow-seed-prompts.ts",
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

  // Listing seeds on first access and puts Native first.
  const claudeEntries = await catalog.listProfilesForProvider("claude");
  assert.equal(claudeEntries[0].id, NATIVE_SESSION_PROFILE_ID);
  assert.equal(claudeEntries[0].kind, "native");
  const claudeIds = claudeEntries.map((entry) => entry.id);
  assert.ok(claudeIds.includes("review"));
  assert.ok(claudeIds.includes("codeai-workflow-claude"));
  assert.ok(!claudeIds.includes("codeai-workflow-kimi"));

  const codexEntries = await catalog.listProfilesForProvider("codex");
  const codexIds = codexEntries.map((entry) => entry.id);
  assert.ok(codexIds.includes("review"));
  assert.ok(!codexIds.includes("codeai-workflow-claude"));

  // Unsupported providers only get Native.
  const openrouterEntries = await catalog.listProfilesForProvider("openrouter");
  assert.deepEqual(
    openrouterEntries.map((entry) => entry.id),
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
    providerId: "openrouter",
  });
  assert.deepEqual(explicitNative, { kind: "native", ok: true });

  // Managed resolution returns the loaded profile.
  const managed = await catalog.resolveForSession({
    profileId: "review",
    providerId: "glm-native",
  });
  assert.equal(managed.ok, true);
  assert.equal(managed.kind, "managed");
  assert.equal(managed.profile.id, "review");

  // Selected but broken/inapplicable/missing profiles are structured errors.
  const brokenResolution = await catalog.resolveForSession({
    profileId: "broken",
    providerId: "claude",
  });
  assert.equal(brokenResolution.ok, false);
  assert.match(brokenResolution.error, /cannot be applied/u);

  const inapplicable = await catalog.resolveForSession({
    profileId: "codeai-workflow-kimi",
    providerId: "claude",
  });
  assert.equal(inapplicable.ok, false);
  assert.match(inapplicable.error, /not applicable/u);

  const missing = await catalog.resolveForSession({
    profileId: "does-not-exist",
    providerId: "claude",
  });
  assert.equal(missing.ok, false);
  assert.match(missing.error, /cannot be applied/u);

  const unsupported = await catalog.resolveForSession({
    profileId: "review",
    providerId: "openrouter",
  });
  assert.equal(unsupported.ok, false);
  assert.match(unsupported.error, /does not support managed session profiles/u);

  console.log("profile-catalog tests: OK");
} finally {
  await rm(buildDirectory, { force: true, recursive: true });
  await rm(profilesRoot, { force: true, recursive: true });
}
