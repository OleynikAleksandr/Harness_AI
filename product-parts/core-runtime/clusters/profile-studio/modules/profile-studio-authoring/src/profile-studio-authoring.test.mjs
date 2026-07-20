import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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

const { ProfileStudioAuthoringFacade } = await import(
  `data:text/javascript;base64,${Buffer.from(
    compile("profile-studio-authoring-facade.ts")
  ).toString("base64")}`
);

const captureRoot = await mkdtemp(path.join(tmpdir(), "studio-captures-"));
const outsideRoot = await mkdtemp(path.join(tmpdir(), "outside-captures-"));

async function writeCapture({
  captureId = "capture-1",
  directory = captureRoot,
  modelId = "opus",
  providerId = "claude",
} = {}) {
  const stem = `${captureId}-native-request`;
  const rawPath = path.join(directory, `${stem}.jsonl`);
  const diagnosticsPath = path.join(directory, `${stem}.diagnostics.jsonl`);
  const request = {
    body: { model: modelId, system: "Native prompt", tools: [] },
    method: "POST",
    path: "/v1/messages",
    target: "api.example.test",
  };
  await writeFile(
    rawPath,
    `${JSON.stringify({
      captureId,
      providerId,
      request,
      type: "request_captured",
    })}\n`,
    "utf8"
  );
  await writeFile(
    diagnosticsPath,
    [
      JSON.stringify({
        captureId,
        providerId,
        selectedModelId: modelId,
        type: "capture_start",
      }),
      JSON.stringify({ captureId, status: "captured", type: "capture_end" }),
      "",
    ].join("\n"),
    "utf8"
  );
  return { rawPath, request };
}

function createLifecycle(providerId = "claude", modelId = "opus") {
  const applied = [];
  return {
    applied,
    lifecycle: {
      applyDraftSnapshot(request) {
        applied.push(request);
        return Promise.resolve({
          ok: true,
          profile: {
            contentHash: "updated-hash",
            profileId: request.profileId,
          },
        });
      },
      getProfile(profileId) {
        return Promise.resolve({
          ok: true,
          profile: {
            profileId,
            target: { modelId, providerId },
          },
        });
      },
    },
  };
}

function creatorSnapshot(artifactPath) {
  return {
    customInstructions: "Create planning documents.\n",
    description: "Planning workflow",
    donorReference: artifactPath ? { artifactPath } : null,
    name: "Planning Documents",
    purpose: "Discuss scope and produce planning evidence",
    systemPrompt: "Reduced native planning foundation.\n",
    toolSelection: {
      mode: "claude-subset",
      tools: [{ name: "Read" }, { function: { name: "Glob" } }],
    },
  };
}

try {
  const capture = await writeCapture();
  const claude = createLifecycle();
  const authoring = new ProfileStudioAuthoringFacade({
    captureRootDirectory: captureRoot,
    lifecycle: claude.lifecycle,
  });
  const applied = await authoring.applyCreatorSnapshot({
    profileId: "draft-1",
    snapshot: creatorSnapshot(capture.rawPath),
  });
  assert.equal(applied.ok, true);
  assert.equal(claude.applied.length, 1);
  assert.equal(
    claude.applied[0].snapshot.nativeCaptureDonor.captureId,
    "capture-1"
  );
  assert.equal(
    claude.applied[0].snapshot.nativeCaptureDonor.requestHash,
    createHash("sha256").update(JSON.stringify(capture.request)).digest("hex")
  );
  assert.deepEqual(claude.applied[0].snapshot.tools, [
    { name: "Read" },
    { function: { name: "Glob" } },
  ]);

  const outside = await writeCapture({ directory: outsideRoot });
  const outsideResult = await authoring.applyCreatorSnapshot({
    profileId: "draft-1",
    snapshot: creatorSnapshot(outside.rawPath),
  });
  assert.equal(outsideResult.ok, false);
  assert.match(outsideResult.error, /inside the capture root/u);
  assert.equal(claude.applied.length, 1);

  const wrongModel = await writeCapture({
    captureId: "capture-sonnet",
    modelId: "sonnet",
  });
  const wrongModelResult = await authoring.applyCreatorSnapshot({
    profileId: "draft-1",
    snapshot: creatorSnapshot(wrongModel.rawPath),
  });
  assert.equal(wrongModelResult.ok, false);
  assert.match(wrongModelResult.error, /does not match/u);

  const wrongClaudeMode = await authoring.applyCreatorSnapshot({
    profileId: "draft-1",
    snapshot: {
      ...creatorSnapshot(null),
      toolSelection: { mode: "codex-fixed", tools: null },
    },
  });
  assert.equal(wrongClaudeMode.ok, false);
  assert.match(wrongClaudeMode.error, /not valid for claude/u);

  const duplicateTools = await authoring.applyCreatorSnapshot({
    profileId: "draft-1",
    snapshot: {
      ...creatorSnapshot(null),
      toolSelection: {
        mode: "claude-subset",
        tools: [{ name: "Read" }, { name: "Read" }],
      },
    },
  });
  assert.equal(duplicateTools.ok, false);
  assert.match(duplicateTools.error, /unique/u);

  const codex = createLifecycle("codex", "gpt-5.6-sol");
  const codexAuthoring = new ProfileStudioAuthoringFacade({
    captureRootDirectory: captureRoot,
    lifecycle: codex.lifecycle,
  });
  const codexApplied = await codexAuthoring.applyCreatorSnapshot({
    profileId: "draft-codex",
    snapshot: {
      ...creatorSnapshot(null),
      toolSelection: { mode: "codex-fixed", tools: null },
    },
  });
  assert.equal(codexApplied.ok, true);
  assert.equal(codex.applied[0].snapshot.tools, null);

  const kimiCapture = await writeCapture({
    captureId: "capture-kimi",
    modelId: "k3",
    providerId: "kimi",
  });
  const kimi = createLifecycle("kimi-client", "k3");
  const kimiAuthoring = new ProfileStudioAuthoringFacade({
    captureRootDirectory: captureRoot,
    lifecycle: kimi.lifecycle,
  });
  const kimiApplied = await kimiAuthoring.applyCreatorSnapshot({
    profileId: "draft-kimi",
    snapshot: {
      ...creatorSnapshot(kimiCapture.rawPath),
      toolSelection: {
        mode: "kimi-candidate",
        tools: [{ name: "ReadFile" }],
      },
    },
  });
  assert.equal(kimiApplied.ok, true);
  assert.equal(
    kimi.applied[0].snapshot.nativeCaptureDonor.providerId,
    "kimi-client"
  );

  console.log("profile-studio-authoring tests: OK");
} finally {
  await rm(captureRoot, { force: true, recursive: true });
  await rm(outsideRoot, { force: true, recursive: true });
}
