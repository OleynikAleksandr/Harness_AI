import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-title-service.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { SessionTitleService } = await import(moduleUrl);
const service = new SessionTitleService();

const session = {
  createdAt: "2026-07-11T00:00:00.000Z",
  id: "session-root",
  model: "gpt-5.6-sol",
  nextSessionMode: { invocationMode: "native", requestMode: "raw" },
  providerId: "codex",
  providerName: "Codex",
  sessionKind: "primary",
  title: "Codex session",
  titleOrigin: "default",
  updatedAt: "2026-07-11T00:00:00.000Z",
  workspaceId: "workspace-test",
};

const automatic = service.applyInitialAutoTitle(
  session,
  "  Исследуй   structured subagent events и подготовь очень подробный отчёт для интерфейса пользователя  ",
  "2026-07-11T00:00:01.000Z"
);
assert.equal(automatic.titleOrigin, "auto");
assert.equal(automatic.title.length <= 72, true);
assert.equal(automatic.title.includes("  "), false);

const unchanged = service.applyInitialAutoTitle(
  automatic,
  "This must not replace the first automatic title",
  "2026-07-11T00:00:02.000Z"
);
assert.equal(unchanged.title, automatic.title);

const renamed = service.rename(
  automatic,
  "  Моя   основная сессия  ",
  "2026-07-11T00:00:03.000Z"
);
assert.equal(renamed.ok, true);
assert.equal(renamed.session.title, "Моя основная сессия");
assert.equal(renamed.session.titleOrigin, "manual");
assert.equal(service.rename(session, "   ", "now").ok, false);

const locked = service.applyInitialAutoTitle(
  renamed.session,
  "Do not overwrite manual title",
  "2026-07-11T00:00:04.000Z"
);
assert.equal(locked.title, "Моя основная сессия");

const regenerated = service.regenerate(
  renamed.session,
  "Пересобери дерево сессий",
  "2026-07-11T00:00:05.000Z"
);
assert.equal(regenerated.ok, true);
assert.equal(regenerated.session.title, "Пересобери дерево сессий");
assert.equal(regenerated.session.titleOrigin, "auto");

const child = {
  ...session,
  parentSessionId: session.id,
  sessionKind: "subagent",
};
assert.equal(service.regenerate(child, "Child task", "now").ok, false);
assert.equal(
  service.applyInitialAutoTitle(child, "Child task", "now").title,
  child.title
);

let storedSession = session;
const context = {
  getFirstUserMessage: () => "Первая пользовательская задача",
  getSession: (sessionId) =>
    sessionId === storedSession.id ? storedSession : undefined,
  updateSession: (updatedSession) => {
    storedSession = updatedSession;
  },
};
assert.equal(
  service.renameSession(
    { sessionId: session.id, title: "Командное имя" },
    context
  ).ok,
  true
);
assert.equal(storedSession.title, "Командное имя");
assert.equal(
  service.regenerateSessionTitle({ sessionId: session.id }, context).ok,
  true
);
assert.equal(storedSession.title, "Первая пользовательская задача");
assert.equal(
  service.renameSession({ sessionId: "missing", title: "No" }, context).ok,
  false
);
