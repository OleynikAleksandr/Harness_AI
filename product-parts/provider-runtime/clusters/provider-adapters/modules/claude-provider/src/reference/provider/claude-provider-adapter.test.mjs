import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The adapter pulls the whole SDK graph, so this is a source-contract test
// (same style as claude-provider-facade.test.mjs): it pins the subagent
// wiring obligations of docs/architecture/ClaudeSubagentSessions.md.
const adapterSource = readFileSync(
  new URL("./claude-provider-adapter.ts", import.meta.url),
  "utf8"
);

// Pseudo-resume: a child id never reaches the SDK manager.
assert.match(
  adapterSource,
  /if \(isClaudeChildProviderSessionId\(sessionId\)\) \{\s*return sessionId;/u,
  "resumeSession returns child ids without starting an SDK session"
);

// Both session entry points hydrate existing subagent files.
const hydrateCalls = adapterSource.match(/this\.hydrateSubagents\(/gu) ?? [];
assert.equal(
  hydrateCalls.length >= 2,
  true,
  "createSession and resumeSession hydrate subagents"
);

// Turn lifecycle drives the observer polling window.
assert.match(adapterSource, /turn_started/u);
assert.match(adapterSource, /turn_completed/u);
assert.match(adapterSource, /startTurnPolling\(\)/u);
assert.match(adapterSource, /stopTurnPolling\(\)/u);

// Session id promotion retargets the observer.
assert.match(adapterSource, /reassignSubagentObserver\(payload\.oldId/u);
assert.match(adapterSource, /updateParentSession\(newId\)/u);

// The observer scans the projects root: the CLI derives the slug directory
// from its cwd, so the configured facade slug must not be trusted.
assert.match(adapterSource, /resolveClaudeProviderProjectsDir\(\)/u);
assert.match(adapterSource, /projectsDir: this\.projectsDir/u);

// Scan errors surface through the reporter instead of dying silently.
assert.match(adapterSource, /onScanError: \(error: unknown\) =>/u);
assert.match(adapterSource, /Claude subagent scan failed/u);

// Child close only clears channel state; parent close stops its observer.
assert.match(
  adapterSource,
  /isClaudeChildProviderSessionId\(sessionId\)\) \{\s*this\.listeners\.delete\(sessionId\);/u,
  "closeSession short-circuits for child ids"
);

// Subagent events reuse the existing channel dispatch (buffered until Core
// subscribes via adoptProviderSession).
assert.match(
  adapterSource,
  /emitToChild: \(childId, payload\) =>\s*this\.dispatchMessage\(childId, payload\)/u
);
assert.match(
  adapterSource,
  /emitToParent: \(event\) => this\.dispatchMessage\(resolvedId, event\)/u
);

console.log("claude-provider-adapter tests passed");
