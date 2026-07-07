import { parse as parseYaml } from "yaml";

export const SESSION_PROFILE_TOOLING_CATEGORIES = [
  "file-read",
  "file-write",
  "shell",
  "web",
  "git",
  "tests",
] as const;

export type SessionProfileToolingCategory =
  (typeof SESSION_PROFILE_TOOLING_CATEGORIES)[number];

export type SessionProfileScope = "individual" | "universal";

export interface SessionProfilePassport {
  readonly description: string;
  readonly name: string;
  readonly provider?: string;
}

export interface SessionProfileTooling {
  readonly categories: Readonly<Record<SessionProfileToolingCategory, boolean>>;
}

export interface SessionProfileNativeRequestBundle {
  readonly customInstructions?: string;
  readonly requestTemplate?: Readonly<Record<string, unknown>>;
  readonly tools?: readonly Readonly<Record<string, unknown>>[];
}

export interface SessionProfilePassportParseResult {
  readonly issues: readonly string[];
  readonly passport?: SessionProfilePassport;
}

export interface SessionProfileToolingParseResult {
  readonly issues: readonly string[];
  readonly tooling?: SessionProfileTooling;
}

export interface SessionProfilePromptParseResult {
  readonly issues: readonly string[];
  readonly promptBody?: string;
}

export interface SessionProfileJsonParseResult {
  readonly issues: readonly string[];
  readonly value?: unknown;
}

const CATEGORY_ON_VALUES = new Set(["on", "true", "yes"]);
const CATEGORY_OFF_VALUES = new Set(["off", "false", "no"]);

export function resolveSessionProfileScope(
  passport: SessionProfilePassport
): SessionProfileScope {
  return passport.provider?.trim() ? "individual" : "universal";
}

export function parseSessionProfilePassport(
  yamlText: string
): SessionProfilePassportParseResult {
  const parsed = parseYamlDocument(yamlText, "profile.yaml");
  if (parsed.issue) {
    return { issues: [parsed.issue] };
  }
  const record = parsed.record ?? {};
  const issues: string[] = [];
  const name = readTrimmedString(record.name);
  if (!name) {
    issues.push('profile.yaml: "name" must be a non-empty string.');
  }
  const description = readTrimmedString(record.description) ?? "";
  let provider: string | undefined;
  if (record.provider !== undefined) {
    provider = readTrimmedString(record.provider);
    if (!provider) {
      issues.push(
        'profile.yaml: "provider" must be a non-empty string when present.'
      );
    }
  }
  if (issues.length > 0 || !name) {
    return { issues };
  }
  return {
    issues,
    passport: provider
      ? { description, name, provider }
      : { description, name },
  };
}

export function parseSessionProfileTooling(
  yamlText: string
): SessionProfileToolingParseResult {
  const parsed = parseYamlDocument(yamlText, "tooling.yaml");
  if (parsed.issue) {
    return { issues: [parsed.issue] };
  }
  const record = parsed.record ?? {};
  const issues: string[] = [];
  const rawCategories = record.categories;
  if (rawCategories === undefined || rawCategories === null) {
    issues.push('tooling.yaml: missing "categories" mapping.');
    return { issues };
  }
  if (!isPlainRecord(rawCategories)) {
    issues.push('tooling.yaml: "categories" must be a key/value mapping.');
    return { issues };
  }
  const categories = defaultToolingCategories();
  for (const [key, rawValue] of Object.entries(rawCategories)) {
    if (!isToolingCategory(key)) {
      issues.push(
        `tooling.yaml: unknown category "${key}". Known categories: ${SESSION_PROFILE_TOOLING_CATEGORIES.join(", ")}.`
      );
      continue;
    }
    const value = readCategorySwitch(rawValue);
    if (value === undefined) {
      issues.push(
        `tooling.yaml: category "${key}" must be on/off (or true/false), got "${String(rawValue)}".`
      );
      continue;
    }
    categories[key] = value;
  }
  if (issues.length > 0) {
    return { issues };
  }
  return { issues, tooling: { categories } };
}

export function parseSessionProfilePromptBody(
  promptText: string
): SessionProfilePromptParseResult {
  if (!promptText.trim()) {
    return { issues: ["system-prompt.md: the prompt body is empty."] };
  }
  return { issues: [], promptBody: promptText };
}

export function parseSessionProfileJsonDocument(
  jsonText: string,
  fileName: string
): SessionProfileJsonParseResult {
  try {
    return { issues: [], value: JSON.parse(jsonText) as unknown };
  } catch (error) {
    return {
      issues: [
        `${fileName}: invalid JSON (${error instanceof Error ? error.message : String(error)}).`,
      ],
    };
  }
}

function defaultToolingCategories(): Record<
  SessionProfileToolingCategory,
  boolean
> {
  const categories = {} as Record<SessionProfileToolingCategory, boolean>;
  for (const category of SESSION_PROFILE_TOOLING_CATEGORIES) {
    categories[category] = true;
  }
  return categories;
}

function isToolingCategory(
  value: string
): value is SessionProfileToolingCategory {
  return (SESSION_PROFILE_TOOLING_CATEGORIES as readonly string[]).includes(
    value
  );
}

function readCategorySwitch(rawValue: unknown): boolean | undefined {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }
  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().toLowerCase();
    if (CATEGORY_ON_VALUES.has(normalized)) {
      return true;
    }
    if (CATEGORY_OFF_VALUES.has(normalized)) {
      return false;
    }
  }
  return;
}

function readTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseYamlDocument(
  yamlText: string,
  fileLabel: string
): { issue?: string; record?: Record<string, unknown> } {
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlText);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { issue: `${fileLabel}: invalid YAML — ${reason}` };
  }
  if (parsed === undefined || parsed === null) {
    return { record: {} };
  }
  if (!isPlainRecord(parsed)) {
    return {
      issue: `${fileLabel}: expected a key/value mapping at the top level.`,
    };
  }
  return { record: parsed };
}
