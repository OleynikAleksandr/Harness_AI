import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "grok-profile-application-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "grok-acp-contracts.ts",
    "grok-tool-inventory.ts",
    "grok-profile-application.ts",
  ]) {
    const source = readFileSync(
      new URL(filename, import.meta.url),
      "utf8"
    ).replace(
      'from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js"',
      'from "./provider-adapter-contract-facade.js"'
    );
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      compiled,
      "utf8"
    );
  }
  writeFileSync(
    path.join(buildDir, "provider-adapter-contract-facade.js"),
    "export {};\n",
    "utf8"
  );
  const {
    buildGrokProfileApplication,
    resolveGrokSessionProfileState,
    verifyGrokProfileApplication,
  } = await import(
    pathToFileURL(path.join(buildDir, "grok-profile-application.js")).href
  );
  const { mapGrokToolCategories } = await import(
    pathToFileURL(path.join(buildDir, "grok-tool-inventory.js")).href
  );

  assert.deepEqual(
    mapGrokToolCategories({
      "file-read": true,
      "file-write": false,
      git: true,
      unknown: true,
    }),
    {
      ignoredEnabledCategories: ["unknown"],
      tools: ["Read", "Glob", "Grep", "Bash"],
    }
  );

  const payload = {
    contentHash: "sha256:managed",
    profileId: "Review Profile",
    profileName: "Review",
    prompt: "Exact managed system prompt\n",
    toolingCategories: {
      "file-read": true,
      "file-write": false,
      git: false,
      shell: false,
      tests: false,
      web: false,
    },
  };
  const state = resolveGrokSessionProfileState({
    profile: payload,
    profileKind: "managed",
  });
  const application = buildGrokProfileApplication(state);
  assert.equal(
    application.sessionMeta.systemPromptOverride,
    "Exact managed system prompt\n"
  );
  assert.deepEqual(application.sessionMeta.agentProfile, {
    agentsMd: false,
    description: "Harness managed session profile: Review",
    discoverSkills: false,
    name: "harness-review-profile",
    tools: ["Read", "Glob", "Grep"],
  });
  assert.equal("promptMode" in application.sessionMeta.agentProfile, false);
  assert.equal("promptBody" in application.sessionMeta.agentProfile, false);

  const verified = verifyGrokProfileApplication(application, {
    result: {
      agentName: "harness-review-profile",
      context: { toolDefinitionsCount: 5 },
    },
  });
  assert.equal(verified.profileBindingVerified, true);
  assert.equal(verified.toolDefinitionsCount, 5);
  assert.throws(
    () =>
      verifyGrokProfileApplication(application, {
        result: {
          agentName: "grok-build",
          context: { toolDefinitionsCount: 25 },
        },
      }),
    /binding failed/u
  );
  assert.throws(
    () =>
      verifyGrokProfileApplication(application, {
        result: {
          agentName: "harness-review-profile",
          context: { toolDefinitionsCount: 25 },
        },
      }),
    /tool binding failed/u
  );

  const native = buildGrokProfileApplication(
    resolveGrokSessionProfileState({ profileKind: "native" })
  );
  assert.deepEqual(native.sessionMeta, {});
  assert.equal(native.details.mode, "native");
  assert.equal(native.verification, undefined);

  assert.throws(
    () =>
      buildGrokProfileApplication({
        kind: "managed",
        payload: {
          ...payload,
          toolingCategories: { future: true },
        },
      }),
    /no verified enabled tool category/u
  );
  assert.throws(
    () => resolveGrokSessionProfileState({ profileKind: "managed" }),
    /requires a frozen profile payload/u
  );

  console.log("grok-profile-application tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
