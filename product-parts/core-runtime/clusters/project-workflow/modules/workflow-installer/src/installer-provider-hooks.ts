import { ensure } from "../../workflow-platform/src/workflow-platform-facade.js";

export type ProviderClient = "claude" | "codex";

const KIT_LAUNCHER_MARK = "scripts/workflow";
const KIT_HOOK_MARK = "hook session-start";

interface HookCommand {
  command: string;
  type: "command";
}

interface HookGroup {
  hooks: HookCommand[];
  matcher?: string;
}

/** The SessionStart command a provider runs in the project directory. */
function sessionStartCommand(client: ProviderClient): string {
  return client === "claude"
    ? `"$CLAUDE_PROJECT_DIR/scripts/workflow" hook session-start --client claude`
    : "scripts/workflow hook session-start --client codex";
}

function kitGroup(client: ProviderClient): HookGroup {
  return { hooks: [{ command: sessionStartCommand(client), type: "command" }] };
}

function isKitGroup(group: unknown): boolean {
  const hooks = (group as HookGroup | null)?.hooks;
  return (
    Array.isArray(hooks) &&
    hooks.some(
      (hook) =>
        typeof hook?.command === "string" &&
        hook.command.includes(KIT_LAUNCHER_MARK) &&
        hook.command.includes(KIT_HOOK_MARK)
    )
  );
}

function parseObject(
  current: string | null,
  file: string
): Record<string, unknown> {
  if (current === null || current.trim() === "") {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(current);
  } catch {
    parsed = null;
  }
  ensure(
    parsed && typeof parsed === "object" && !Array.isArray(parsed),
    "MANAGED_JSON",
    `${file} is not a JSON object; fix it by hand first.`,
    { path: file }
  );
  return parsed as Record<string, unknown>;
}

/**
 * Adds or replaces the Kit SessionStart entry and keeps every other hook and
 * setting of the file.
 */
export function mergeSessionStartHook(
  current: string | null,
  client: ProviderClient,
  file: string
): string {
  const settings = parseObject(current, file);
  const hooks = (
    settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {}
  ) as Record<string, unknown>;
  const existing = Array.isArray(hooks.SessionStart) ? hooks.SessionStart : [];
  const merged = {
    ...settings,
    hooks: {
      ...hooks,
      SessionStart: [
        ...existing.filter((group) => !isKitGroup(group)),
        kitGroup(client),
      ],
    },
  };
  return `${JSON.stringify(merged, null, 2)}\n`;
}

/** The Kit entry of a provider settings file, normalized, or null. */
export function extractSessionStartHook(current: string | null): string | null {
  try {
    const settings = JSON.parse(current ?? "") as {
      hooks?: { SessionStart?: unknown[] };
    };
    const group = (settings.hooks?.SessionStart ?? []).find(isKitGroup);
    return group ? JSON.stringify(group) : null;
  } catch {
    return null;
  }
}

export function expectedSessionStartHook(client: ProviderClient): string {
  return JSON.stringify(kitGroup(client));
}
