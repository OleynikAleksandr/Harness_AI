import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const facadeSource = readFileSync(
  new URL("./settings-store-facade.ts", import.meta.url),
  "utf8"
);
const projectionsSource = readFileSync(
  new URL("./settings-store-projections.ts", import.meta.url),
  "utf8"
);

// Kimi keeps the key-only onboarding shape plus the common auto-update and
// session-continuity settings with Codex-equivalent defaults.
assert.match(
  facadeSource,
  /kimiClient: ProviderClientKeySettings &\s*Pick<ProviderCommonSettings, "autoUpdate" \| "sessionContinuity">/u
);
assert.match(
  facadeSource,
  /kimiClient: \{\s*apiKey: "",\s*autoUpdate: \{ enabled: false \},\s*defaultModel: "kimi-for-coding",\s*sessionContinuity: \{ remainingPercentThreshold: 30 \},\s*\}/u
);

// Auto-update is machine-wide truth (system settings file), the continuity
// threshold is workspace truth — the same split the other providers use.
const systemProjection = projectionsSource.slice(
  projectionsSource.indexOf("function systemSettingsFrom"),
  projectionsSource.indexOf("function workspaceSettingsFrom")
);
const workspaceProjection = projectionsSource.slice(
  projectionsSource.indexOf("function workspaceSettingsFrom")
);
assert.match(
  systemProjection,
  /kimiClient: \{\s*apiKey: settings\.providers\.kimiClient\.apiKey,\s*autoUpdate: settings\.providers\.kimiClient\.autoUpdate,\s*defaultModel: settings\.providers\.kimiClient\.defaultModel,\s*\}/u
);
assert.doesNotMatch(systemProjection, /kimiClient\.sessionContinuity/u);
assert.match(
  workspaceProjection,
  /kimiClient: \{\s*sessionContinuity: settings\.providers\.kimiClient\.sessionContinuity,\s*\}/u
);
assert.doesNotMatch(workspaceProjection, /kimiClient\.autoUpdate/u);

console.log("settings-store-projections tests passed");
