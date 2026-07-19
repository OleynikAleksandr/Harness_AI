import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-message-coalescing-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "kimi-acp-session-contracts.ts",
    "kimi-subagent-normalizer.ts",
    "kimi-session-event-normalizer.ts",
  ]) {
    const source = readFileSync(
      new URL(`./${filename}`, import.meta.url),
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

  const { KimiSessionEventNormalizer } = await import(
    pathToFileURL(path.join(buildDir, "kimi-session-event-normalizer.js")).href
  );
  const liveCoalescerSource = readFileSync(
    new URL(
      "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/live-assistant-message-coalescer.ts",
      import.meta.url
    ),
    "utf8"
  );
  const liveCoalescerModuleUrl = `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(liveCoalescerSource, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
  ).toString("base64")}`;
  const { coalesceLiveAssistantMessages } = await import(
    liveCoalescerModuleUrl
  );

  const normalizer = new KimiSessionEventNormalizer();
  const asUpdate = (text) => ({
    method: "session/update",
    params: {
      sessionId: "kimi-s-list",
      update: {
        content: { text },
        sessionUpdate: "agent_message_chunk",
      },
    },
  });
  const firstListChunk = `${"Сводка результатов. ".repeat(
    24
  )}\nПроверка ограничений\n1.\n`;
  const secondListChunk = `Введение раньше генерации — ✅\n${"Ограничение подтверждено. ".repeat(
    14
  )}\n8.\n`;
  const finalListChunk =
    "Олег до 11:15 — ✅\n9.\nОба полностью на приоритизации — ✅";

  // A semantic buffer flush may happen directly after `1.` / `8.`. The
  // transport still emits one live answer and must preserve the newline at
  // each artificial boundary so Core renders a single correct list.
  const assistantBlocks = [
    ...normalizer.normalizeNotification(asUpdate(firstListChunk)),
    ...normalizer.normalizeNotification(asUpdate(secondListChunk)),
    ...normalizer.normalizeNotification(asUpdate(finalListChunk)),
    ...normalizer.flushTurnEnd(),
  ].filter(
    (event) => event.type === "dialog_message" && event.role === "assistant"
  );
  assert.equal(assistantBlocks.length, 3);
  assert.ok(assistantBlocks.every((event) => event.tag === "live"));
  assert.deepEqual(
    assistantBlocks.map((event) => event.content),
    [firstListChunk, secondListChunk, finalListChunk]
  );

  const coalescedAssistant = coalesceLiveAssistantMessages(
    assistantBlocks.map((event) => ({
      id: event.uuid,
      role: event.role,
      tag: event.tag,
      text: event.content,
      timestamp: event.timestamp,
    }))
  );
  assert.equal(coalescedAssistant.length, 1);
  assert.equal(
    coalescedAssistant[0].text,
    `${firstListChunk}${secondListChunk}${finalListChunk}`
  );
  assert.match(coalescedAssistant[0].text, /\n1\.\nВведение/u);
  assert.match(coalescedAssistant[0].text, /\n8\.\nОлег/u);
} finally {
  await rm(root, { force: true, recursive: true });
}
