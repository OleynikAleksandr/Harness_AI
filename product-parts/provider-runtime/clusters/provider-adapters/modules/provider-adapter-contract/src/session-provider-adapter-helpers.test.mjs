import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-provider-adapter-helpers.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { CliSessionProviderAdapter } = await import(moduleUrl);

const adapter = new CliSessionProviderAdapter({
  args: () => ["-e", "console.log('assistant output')"],
  commands: [process.execPath],
});
const sessionId = await adapter.createSession();
const events = [];
adapter.subscribe(sessionId, (event) => events.push(event));
await adapter.sendMessage(sessionId, "user input");

assert.equal(
  events.some(
    (event) =>
      event?.type === "stream_event" &&
      event?.data?.kind === "token_usage" &&
      event?.data?.tokenUsage?.used > 0
  ),
  true
);

const tempCwd = mkdtempSync(join(tmpdir(), "harness-cli-cwd-"));
try {
  const cwdAdapter = new CliSessionProviderAdapter({
    args: () => ["-e", "console.log(process.cwd())"],
    commands: [process.execPath],
    cwd: () => tempCwd,
  });
  const cwdSessionId = await cwdAdapter.createSession();
  const cwdEvents = [];
  cwdAdapter.subscribe(cwdSessionId, (event) => cwdEvents.push(event));
  await cwdAdapter.sendMessage(cwdSessionId, "where");
  assert.equal(
    cwdEvents.some(
      (event) =>
        event?.type === "dialog_message" &&
        event.content === realpathSync(tempCwd)
    ),
    true
  );
} finally {
  rmSync(tempCwd, { force: true, recursive: true });
}
