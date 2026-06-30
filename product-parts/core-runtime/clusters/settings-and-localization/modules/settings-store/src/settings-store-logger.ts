import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { HarnessSettings } from "./settings-store-facade.js";

type CoreSettingsLogEvent =
  | "settings.get"
  | "settings.reset"
  | "settings.save.completed"
  | "settings.save.requested";

function logCoreSettingsEvent(
  event: CoreSettingsLogEvent,
  details: Record<string, unknown>
): void {
  try {
    ensureHarnessLogRoots();
    appendFileSync(
      path.join(coreLogDirectory(), "settings-store.jsonl"),
      `${JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...details,
      })}\n`,
      "utf8"
    );
  } catch {
    // Logging must never block Core settings persistence.
  }
}

export function logCoreSettingsSnapshot(
  event: CoreSettingsLogEvent,
  workspacePath?: string,
  settings?: HarnessSettings
): void {
  logCoreSettingsEvent(event, {
    ...(settings
      ? { localization: summarizeLocalizationSettings(settings) }
      : {}),
    systemSettingsPath: systemSettingsPath(),
    workspacePath: workspacePath ?? null,
    workspaceSettingsPath: workspacePath
      ? workspaceSettingsPath(workspacePath)
      : null,
  });
}

function summarizeLocalizationSettings(settings: HarnessSettings) {
  const localization = settings.general.localization;
  return {
    categories: { ...localization.categories },
    defaultLanguage: localization.defaultLanguage,
    glossaryEnabled: localization.glossaryEnabled,
    reasoningEngineId: localization.reasoningEngineId,
    uiEngineId: localization.uiEngineId,
    workflowTermsPolicy: localization.workflowTermsPolicy,
  };
}

function ensureHarnessLogRoots(): void {
  mkdirSync(coreLogDirectory(), { recursive: true });
  mkdirSync(path.join(harnessHome(), "logs", "interface"), {
    recursive: true,
  });
  mkdirSync(path.join(harnessHome(), "logs", "providers"), {
    recursive: true,
  });
}

function coreLogDirectory(): string {
  return path.join(harnessHome(), "logs", "core");
}

function harnessHome(): string {
  return (
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai")
  );
}

export function systemSettingsPath(): string {
  return path.join(harnessHome(), "settings", "settings.json");
}

export function workspaceSettingsPath(workspacePath: string): string {
  return path.join(workspacePath, ".harness", "settings", "settings.json");
}
