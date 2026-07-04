// Shared helpers for the built-in tool executors: JSON argument parsing,
// workspace-path validation (no escaping the workspace root), and numeric
// clamping. Behavior ported from the reference glm-native tool executors.

import path from "node:path";

const LEADING_DOT_SLASH_PATTERN = /^\.\/+/u;
const PATH_SEGMENT_SEPARATOR_PATTERN = /[\\/]+/u;

export const parseToolArguments = (value: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(value || "{}");
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Tool arguments must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
};

export const readRequiredString = (
  value: unknown,
  name: string,
  options?: { readonly allowEmpty?: boolean }
): string => {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string.`);
  }
  const result = options?.allowEmpty ? value : value.trim();
  if (!options?.allowEmpty && result.length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return result;
};

// Resolve a tool-provided path against the workspace root and reject anything
// that escapes it. `allowMissing` skips the parent-segment guard for search
// roots (which may point at existing subdirectories).
export const resolveWorkspacePath = (
  value: unknown,
  workspacePath: string,
  options?: { readonly allowMissing?: boolean }
): string => {
  const workspaceRoot = path.resolve(workspacePath);
  const rawPath =
    typeof value === "string" && value.trim() ? value.trim() : ".";
  const cleaned = rawPath.replace(LEADING_DOT_SLASH_PATTERN, "");
  const absolutePath = path.isAbsolute(cleaned)
    ? path.resolve(cleaned)
    : path.resolve(workspaceRoot, cleaned);
  const rootWithSeparator = `${workspaceRoot}${path.sep}`;
  if (
    !(
      absolutePath === workspaceRoot ||
      absolutePath.startsWith(rootWithSeparator)
    )
  ) {
    throw new Error("Path escaped the workspace root.");
  }
  if (
    !options?.allowMissing &&
    cleaned.split(PATH_SEGMENT_SEPARATOR_PATTERN).includes("..")
  ) {
    throw new Error("Path must not contain parent segments.");
  }
  return absolutePath;
};

export const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

// A shell output-char budget derived from an optional token budget (~4 chars
// per token), with a floor so short budgets still return usable output.
export const outputCharsFromBudget = (value: unknown): number =>
  Math.max(4000, clampNumber(value, 1000, 30_000, 10_000) * 4);
