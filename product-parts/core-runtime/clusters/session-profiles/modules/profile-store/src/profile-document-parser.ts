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

interface SessionProfilePassportBase {
  readonly description: string;
  readonly name: string;
}

export interface SessionProfileLegacyPassport
  extends SessionProfilePassportBase {
  readonly provider?: string;
}

export type SessionProfileStudioLifecycleStatus = "draft" | "valid";

export interface SessionProfileNativeCaptureDonorReference {
  readonly artifactPath: string;
  readonly captureId: string;
  readonly modelId: string;
  readonly providerId: string;
  readonly requestHash: string;
}

export interface SessionProfileStudioPassport
  extends SessionProfilePassportBase {
  readonly authoring: "profile-studio";
  readonly creatorSessionId: string;
  readonly model: string;
  readonly nativeCaptureDonor: SessionProfileNativeCaptureDonorReference | null;
  readonly provider: string;
  readonly purpose: string;
  readonly schemaVersion: 2;
  readonly status: SessionProfileStudioLifecycleStatus;
}

export type SessionProfilePassport =
  | SessionProfileLegacyPassport
  | SessionProfileStudioPassport;

export interface SessionProfileTooling {
  readonly categories: Readonly<Record<SessionProfileToolingCategory, boolean>>;
}

export interface SessionProfileNativeRequestBundle {
  readonly customInstructions?: string;
  readonly inputPrefix?: readonly Readonly<Record<string, unknown>>[];
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

export function isSessionProfileStudioPassport(
  passport: SessionProfilePassport
): passport is SessionProfileStudioPassport {
  return "schemaVersion" in passport && passport.schemaVersion === 2;
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
  if (record.schemaVersion !== undefined) {
    return parseStudioPassport(
      record,
      { description, name: name ?? "" },
      issues
    );
  }
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

function parseStudioPassport(
  record: Record<string, unknown>,
  base: SessionProfilePassportBase,
  commonIssues: string[]
): SessionProfilePassportParseResult {
  const issues = [...commonIssues];
  if (record.schemaVersion !== 2) {
    issues.push('profile.yaml: "schemaVersion" must be 2 for Studio profiles.');
  }
  if (record.authoring !== "profile-studio") {
    issues.push(
      'profile.yaml: "authoring" must be "profile-studio" for schemaVersion 2.'
    );
  }
  const provider = readRequiredString(record, "provider", issues);
  const model = readRequiredString(record, "model", issues);
  const creatorSessionId = readRequiredString(
    record,
    "creatorSessionId",
    issues
  );
  const purpose = readOptionalString(record, "purpose", issues) ?? "";
  const status = readStudioLifecycleStatus(record.status, issues);
  const nativeCaptureDonor = readNativeCaptureDonor(
    record.nativeCaptureDonor,
    issues
  );
  if (
    issues.length > 0 ||
    record.schemaVersion !== 2 ||
    record.authoring !== "profile-studio" ||
    !provider ||
    !model ||
    !creatorSessionId ||
    !status ||
    nativeCaptureDonor === undefined
  ) {
    return { issues };
  }
  return {
    issues,
    passport: {
      ...base,
      authoring: "profile-studio",
      creatorSessionId,
      model,
      nativeCaptureDonor,
      provider,
      purpose,
      schemaVersion: 2,
      status,
    },
  };
}

function readStudioLifecycleStatus(
  value: unknown,
  issues: string[]
): SessionProfileStudioLifecycleStatus | undefined {
  if (value === "draft" || value === "valid") {
    return value;
  }
  issues.push('profile.yaml: "status" must be "draft" or "valid".');
  return;
}

function readNativeCaptureDonor(
  value: unknown,
  issues: string[]
): SessionProfileNativeCaptureDonorReference | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isPlainRecord(value)) {
    issues.push(
      'profile.yaml: "nativeCaptureDonor" must be null or a provenance mapping.'
    );
    return;
  }
  const donorIssues: string[] = [];
  const artifactPath = readRequiredString(value, "artifactPath", donorIssues, {
    prefix: "nativeCaptureDonor",
  });
  const captureId = readRequiredString(value, "captureId", donorIssues, {
    prefix: "nativeCaptureDonor",
  });
  const modelId = readRequiredString(value, "modelId", donorIssues, {
    prefix: "nativeCaptureDonor",
  });
  const providerId = readRequiredString(value, "providerId", donorIssues, {
    prefix: "nativeCaptureDonor",
  });
  const requestHash = readRequiredString(value, "requestHash", donorIssues, {
    prefix: "nativeCaptureDonor",
  });
  issues.push(...donorIssues);
  if (!(artifactPath && captureId && modelId && providerId && requestHash)) {
    return;
  }
  return { artifactPath, captureId, modelId, providerId, requestHash };
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  issues: string[],
  options: { readonly prefix?: string } = {}
): string | undefined {
  const value = readTrimmedString(record[key]);
  if (!value) {
    const field = options.prefix ? `${options.prefix}.${key}` : key;
    issues.push(`profile.yaml: "${field}" must be a non-empty string.`);
  }
  return value;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  issues: string[]
): string | undefined {
  if (record[key] === undefined || record[key] === null) {
    return;
  }
  if (typeof record[key] !== "string") {
    issues.push(`profile.yaml: "${key}" must be a string when present.`);
    return;
  }
  return record[key].trim();
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
