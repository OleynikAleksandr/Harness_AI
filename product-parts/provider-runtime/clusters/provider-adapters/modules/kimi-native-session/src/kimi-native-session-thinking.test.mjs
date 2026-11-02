import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-native-thinking-"));

try {
  const buildDir = path.join(root, "build", "kimi-native-session", "src");
  const normalizerContractDir = path.join(
    root,
    "build",
    "provider-events-and-translation",
    "modules",
    "provider-event-normalizer",
    "src"
  );
  await mkdir(buildDir, { recursive: true });
  // Core-served Kimi catalog stub (provider-descriptor): the models the
  // workspace home declares in the CLI config.
  writeFileSync(
    path.join(buildDir, "provider-descriptor-stub.js"),
    'export const providerDescriptorFacade = { getKimiClientModels: () => globalThis.__kimiTestCatalog ?? ["kimi-for-coding", "kimi-for-coding-highspeed", "k3"].map((id) => ({ defaultReasoningEffort: "high", id, label: id, reasoningEfforts: ["low", "high", "max"] })) };\n',
    "utf8"
  );
  await mkdir(normalizerContractDir, { recursive: true });
  writeFileSync(
    path.join(normalizerContractDir, "provider-event-normalizer-facade.js"),
    "export {};\n",
    "utf8"
  );
  const homeManagerSource = readFileSync(
    new URL(
      "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts",
      import.meta.url
    ),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "provider-home-manager-facade.js"),
    ts.transpileModule(homeManagerSource, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    "utf8"
  );
  for (const filename of [
    "kimi-acp-session-contracts.ts",
    "kimi-acp-session-router.ts",
    "kimi-acp-session-process.ts",
    "kimi-subagent-normalizer.ts",
    "kimi-session-event-normalizer.ts",
    "kimi-session-usage-reader.ts",
    "kimi-subagent-wire-channel.ts",
    "kimi-swarm-progress-reader.ts",
    "kimi-workspace-home.ts",
    "kimi-native-session-runtime.ts",
  ]) {
    const source = readFileSync(
      new URL(`./${filename}`, import.meta.url),
      "utf8"
    );
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      compiled
        .replaceAll(
          "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js",
          "../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js"
        )
        .replaceAll(
          "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js",
          "./provider-home-manager-facade.js"
        )
        .replaceAll(
          "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js",
          "./provider-descriptor-stub.js"
        )
        .replaceAll(
          "../../kimi-subagent-wire/src/kimi-subagent-wire-facade.js",
          "./kimi-subagent-wire-facade.js"
        ),
      "utf8"
    );
  }
  // The child channel reads through the sibling kimi-subagent-wire module;
  // its sources join the flat build from the neighboring module directory.
  for (const filename of [
    "kimi-subagent-wire-facade.ts",
    "kimi-subagent-wire-resolve.ts",
  ]) {
    const source = readFileSync(
      new URL(`../../kimi-subagent-wire/src/${filename}`, import.meta.url),
      "utf8"
    );
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      "utf8"
    );
  }
  const { KimiNativeSessionRuntime } = await import(
    pathToFileURL(path.join(buildDir, "kimi-native-session-runtime.js")).href
  );

  // A CLI that refuses every set_config_option: the full-access mode
  // refusal keeps the session alive with one honest diagnostic, and the
  // thinking-effort scenarios run against the same fake.
  const refusingCli = path.join(root, "fake-kimi-refusing.mjs");
  await writeFile(
    refusingCli,
    [
      'import { createInterface } from "node:readline";',
      "const write = (payload) => {",
      '  process.stdout.write(JSON.stringify(payload) + "\\n");',
      "};",
      "const rl = createInterface({ input: process.stdin });",
      'rl.on("line", (line) => {',
      "  const message = JSON.parse(line);",
      '  if (message.method === "initialize") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: {} });',
      "  }",
      '  if (message.method === "session/new") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: { sessionId: "s-4" } });',
      "  }",
      '  if (message.method === "session/set_config_option") {',
      "    write({",
      '      error: { code: -32603, message: "Internal error" },',
      "      id: message.id,",
      '      jsonrpc: "2.0",',
      "    });",
      "  }",
      '  if (message.method === "session/prompt") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: { stopReason: "end_turn" } });',
      "  }",
      "});",
    ].join("\n"),
    "utf8"
  );

  const refusalEvents = [];
  const refusingRuntime = new KimiNativeSessionRuntime({
    onEvent: (event) => refusalEvents.push(event),
    processOverrides: { command: process.execPath, commandArgs: [refusingCli] },
    usageReader: () => null,
    workspacePath: root,
  });
  await refusingRuntime.prompt("still works");
  await refusingRuntime.close();
  const refusalKinds = refusalEvents
    .filter((event) => event.type === "stream_event")
    .map((event) => event.data.kind);
  assert.ok(refusalKinds.includes("kimi_full_access_unavailable"));
  assert.equal(refusalEvents.at(-1).type, "turn_completed");

  // Thinking effort: the driver opens eagerly at create, so the first
  // turn's differing level relaunches the still-empty child with the level
  // written; after the first real turn differing levels surface the locked
  // diagnostic; unsupported levels are refused with a diagnostic.
  const effortEvents = [];
  const effortRuntime = new KimiNativeSessionRuntime({
    onEvent: (event) => effortEvents.push(event),
    processOverrides: { command: process.execPath, commandArgs: [refusingCli] },
    usageReader: () => null,
    workspacePath: root,
  });
  await effortRuntime.open();
  await effortRuntime.prompt("first turn", undefined, "max");
  const homeConfigPath = path.join(
    root,
    ".harness",
    "runtime",
    "providers",
    "kimi",
    "home",
    ".kimi-code",
    "config.toml"
  );
  assert.match(readFileSync(homeConfigPath, "utf8"), /effort = "max"/u);
  await effortRuntime.prompt("second turn", undefined, "low");
  await effortRuntime.close();
  const effortKinds = effortEvents
    .filter((event) => event.type === "stream_event")
    .map((event) => event.data.kind);
  // The pre-first-turn relaunch applied "max" without a locked diagnostic;
  // only the post-turn "low" locks.
  assert.equal(
    effortKinds.filter((kind) => kind === "kimi_thinking_effort_locked").length,
    1
  );
  assert.match(readFileSync(homeConfigPath, "utf8"), /effort = "max"/u);

  const unsupportedEvents = [];
  const unsupportedRuntime = new KimiNativeSessionRuntime({
    onEvent: (event) => unsupportedEvents.push(event),
    processOverrides: { command: process.execPath, commandArgs: [refusingCli] },
    usageReader: () => null,
    workspacePath: root,
  });
  await unsupportedRuntime.prompt("weird effort", undefined, "weird");
  await unsupportedRuntime.close();
  assert.ok(
    unsupportedEvents.some(
      (event) =>
        event.type === "stream_event" &&
        event.data.kind === "kimi_thinking_effort_unsupported"
    )
  );

  console.log("kimi native session thinking tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
