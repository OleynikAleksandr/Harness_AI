import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildWorkflowModules } from "../../workflow-platform/src/workflow-test-build.mjs";

const build = await buildWorkflowModules(
  ["workflow-installer"],
  "workflow-installer-payload"
);
try {
  const { WorkflowInstallerFacade } = await build.load(
    "workflow-installer",
    "workflow-installer-facade.js"
  );
  const installer = new WorkflowInstallerFacade();
  const entries = installer.payload({
    bundle: "// bundle\n",
    hooksPath: null,
    projectName: "Demo",
  });
  const byPath = Object.fromEntries(
    entries.map((entry) => [entry.path, entry])
  );
  assert.equal(installer.version, "2.0.0");
  assert.deepEqual(Object.keys(byPath), [
    ".harness/workflow/runtime/workflow.mjs",
    "scripts/workflow",
    "scripts/workflow.cmd",
    "scripts/workflow.ps1",
    ".harness/workflow/hooks/pre-commit",
    ".harness/workflow/hooks/commit-msg",
    ".harness/workflow/hooks/post-commit",
    ".harness/workflow/hooks/pre-push",
    "AGENTS.md",
    "CLAUDE.md",
    ".codex/hooks.json",
    ".claude/settings.json",
    ".gitignore",
    ".gitattributes",
    "README.md",
    "docs/architecture/OVERVIEW.md",
  ]);

  // Every managed part reads back exactly after rendering, from any start.
  for (const entry of entries.filter((item) => item.kind !== "create")) {
    for (const start of [null, "# Existing\n\nuser text\n"]) {
      if (entry.kind === "json" && start !== null) {
        continue;
      }
      const once = entry.render(start);
      assert.equal(
        entry.read(once),
        entry.managed,
        `${entry.path} from ${start}`
      );
      assert.equal(entry.render(once), once, `${entry.path} is idempotent`);
    }
  }

  // Sections keep the user's text byte for byte, CRLF included.
  const agents = byPath["AGENTS.md"];
  const user = "# Project rules\r\n\r\nKeep this.\r\n";
  const merged = agents.render(user);
  assert.ok(merged.startsWith(user));
  assert.match(
    merged,
    /<!-- workflow-kit:begin -->\r\n## Workflow Kit \(managed section/u
  );
  assert.equal(
    agents.render(merged.replace("Never commit with", "Always commit with")),
    merged
  );
  assert.match(
    installer.agentRules(),
    /Never commit with `git commit` directly and never use `--no-verify`/u
  );

  // CLAUDE.md gets the import line once.
  const claude = byPath["CLAUDE.md"];
  assert.equal(claude.render(null), "@AGENTS.md\n");
  assert.equal(claude.render("# Notes"), "# Notes\n\n@AGENTS.md\n");
  assert.equal(claude.render("@AGENTS.md\n# Notes\n"), "@AGENTS.md\n# Notes\n");

  // Provider settings keep foreign hooks and settings; the Kit entry is unique.
  const settings = byPath[".claude/settings.json"];
  const foreign = JSON.stringify({
    hooks: {
      SessionStart: [{ hooks: [{ command: "echo hi", type: "command" }] }],
      Stop: [],
    },
    model: "x",
  });
  const withKit = JSON.parse(settings.render(settings.render(foreign)));
  assert.equal(withKit.model, "x");
  assert.deepEqual(withKit.hooks.Stop, []);
  assert.equal(withKit.hooks.SessionStart.length, 2);
  assert.equal(
    withKit.hooks.SessionStart[1].hooks[0].command,
    '"$CLAUDE_PROJECT_DIR/scripts/workflow" hook session-start --client claude'
  );
  assert.match(
    byPath[".codex/hooks.json"].render(null),
    /scripts\/workflow hook session-start --client codex/u
  );
  assert.throws(() => settings.render("[1]"), { code: "MANAGED_JSON" });

  // Git hooks: own directory, or sections in an existing hooks path.
  assert.match(
    byPath[".harness/workflow/hooks/pre-commit"].render(null),
    /^#!\/bin\/sh\n# Managed by Harness Workflow Kit\. Do not edit\.\n# workflow-kit:begin\n"\$\(git rev-parse --show-toplevel\)\/scripts\/workflow" git-hook pre-commit "\$@" \|\| exit \$\?\n# workflow-kit:end\n$/u
  );
  assert.equal(byPath[".harness/workflow/hooks/pre-push"].executable, true);
  const husky = Object.fromEntries(
    installer
      .payload({ bundle: "", hooksPath: ".husky", projectName: "Demo" })
      .map((entry) => [entry.path, entry])
  );
  const huskyHook = husky[".husky/pre-commit"];
  assert.equal(huskyHook.kind, "section");
  assert.equal(huskyHook.executable, true);
  assert.equal(
    huskyHook.render("#!/usr/bin/env sh\nnpm test\n"),
    '#!/usr/bin/env sh\n# workflow-kit:begin\n"$(git rev-parse --show-toplevel)/scripts/workflow" git-hook pre-commit "$@" || exit $?\n# workflow-kit:end\nnpm test\n'
  );
  assert.match(huskyHook.render(null), /^#!\/bin\/sh\n# workflow-kit:begin\n/u);

  // Created files are never overwritten; gitignore and gitattributes sections.
  assert.equal(byPath["README.md"].render("mine"), "mine");
  assert.match(byPath["README.md"].render(null), /^# Demo\n/u);
  assert.match(
    byPath[".gitignore"].render("node_modules/\n"),
    /^node_modules\/\n\n# workflow-kit:begin\n# Workflow Kit local state\n\.harness\/workflow\/local\//u
  );
  assert.match(
    byPath[".gitattributes"].render(null),
    /scripts\/workflow\.cmd text eol=crlf/u
  );

  // The manifest records kinds and hashes of the managed parts.
  const manifest = installer.manifest(entries);
  const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
  assert.equal(manifest.schema, "harness-workflow-manifest/1");
  assert.equal(
    manifest.files.find((file) => file.path === "scripts/workflow").sha256,
    sha(byPath["scripts/workflow"].managed)
  );
  assert.equal(
    manifest.files.find((file) => file.path === "README.md").sha256,
    null
  );
  assert.equal(JSON.parse(installer.renderManifest(manifest)).version, "2.0.0");
} finally {
  await build.cleanup();
}
