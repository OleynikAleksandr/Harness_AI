import {
  type Dirent,
  type FSWatcher,
  promises as fs,
  mkdirSync,
  watch as watchDirectory,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  parseSessionProfileJsonDocument,
  parseSessionProfilePassport,
  parseSessionProfilePromptBody,
  parseSessionProfileTooling,
  resolveSessionProfileScope,
  SESSION_PROFILE_TOOLING_CATEGORIES,
  type SessionProfileNativeRequestBundle,
  type SessionProfilePassport,
  type SessionProfileScope,
  type SessionProfileTooling,
} from "./profile-document-parser.js";
import { SEED_SESSION_PROFILES } from "./seed/seed-profiles.js";

export {
  resolveSessionProfileScope,
  SESSION_PROFILE_TOOLING_CATEGORIES,
  type SessionProfilePassport,
  type SessionProfileScope,
  type SessionProfileTooling,
  type SessionProfileToolingCategory,
} from "./profile-document-parser.js";

export const SESSION_PROFILE_PASSPORT_FILE_NAME = "profile.yaml";
export const SESSION_PROFILE_CUSTOM_INSTRUCTIONS_FILE_NAME =
  "custom-instructions.md";
export const SESSION_PROFILE_REQUEST_TEMPLATE_FILE_NAME =
  "request-template.json";
export const SESSION_PROFILE_PROMPT_FILE_NAME = "system-prompt.md";
export const SESSION_PROFILE_TOOLING_FILE_NAME = "tooling.yaml";
export const SESSION_PROFILE_TOOLS_FILE_NAME = "tools.json";
export const SESSION_PROFILES_ROOT_DIRECTORY_NAME = "Profiles";

/**
 * Bursts of file events (editor save = several writes/renames) collapse into
 * one notification so consumers rescan the catalog once per save.
 */
const PROFILE_WATCH_DEBOUNCE_MS = 300;

export interface SessionProfileDocumentPaths {
  readonly customInstructionsPath: string;
  readonly passportPath: string;
  readonly profileDirectory: string;
  readonly promptPath: string;
  readonly requestTemplatePath: string;
  readonly toolingPath: string;
  readonly toolsPath: string;
}

export interface SessionProfile {
  readonly documents: SessionProfileDocumentPaths;
  readonly id: string;
  readonly nativeRequest?: SessionProfileNativeRequestBundle;
  readonly passport: SessionProfilePassport;
  readonly promptBody: string;
  readonly scope: SessionProfileScope;
  readonly tooling: SessionProfileTooling;
}

export interface SessionProfileValidationFailure {
  readonly documents: SessionProfileDocumentPaths;
  readonly id: string;
  readonly issues: readonly string[];
}

export type SessionProfileLoadResult =
  | { readonly ok: true; readonly profile: SessionProfile }
  | { readonly failure: SessionProfileValidationFailure; readonly ok: false };

export interface SessionProfileScanResult {
  readonly invalid: readonly SessionProfileValidationFailure[];
  readonly profiles: readonly SessionProfile[];
}

interface ProfileStoreFacadeOptions {
  readonly profilesRootDirectory?: string;
}

interface ProfileDirectoryRef {
  readonly id: string;
  readonly profileDirectory: string;
  readonly providerDirectory?: string;
}

interface MutableSessionProfileNativeRequestBundle {
  customInstructions?: string;
  requestTemplate?: Readonly<Record<string, unknown>>;
  tools?: readonly Readonly<Record<string, unknown>>[];
}

export function resolveSessionProfilesRootDirectory(): string {
  return path.join(harnessHome(), SESSION_PROFILES_ROOT_DIRECTORY_NAME);
}

export class ProfileStoreFacade {
  private readonly profilesRootDirectory: string;

  constructor(options: ProfileStoreFacadeOptions = {}) {
    this.profilesRootDirectory =
      options.profilesRootDirectory ?? resolveSessionProfilesRootDirectory();
  }

  get rootDirectory(): string {
    return this.profilesRootDirectory;
  }

  resolveDocumentPaths(
    profileId: string,
    options: { readonly providerDirectory?: string } = {}
  ): SessionProfileDocumentPaths {
    const profileDirectory = options.providerDirectory
      ? path.join(
          this.profilesRootDirectory,
          options.providerDirectory,
          profileId
        )
      : path.join(this.profilesRootDirectory, profileId);
    return this.resolveDocumentPathsForDirectory(profileDirectory);
  }

  private resolveDocumentPathsForDirectory(
    profileDirectory: string
  ): SessionProfileDocumentPaths {
    const documentPath = (fileName: string) =>
      path.join(profileDirectory, fileName);
    return {
      customInstructionsPath: documentPath(
        SESSION_PROFILE_CUSTOM_INSTRUCTIONS_FILE_NAME
      ),
      passportPath: documentPath(SESSION_PROFILE_PASSPORT_FILE_NAME),
      profileDirectory,
      promptPath: documentPath(SESSION_PROFILE_PROMPT_FILE_NAME),
      requestTemplatePath: documentPath(
        SESSION_PROFILE_REQUEST_TEMPLATE_FILE_NAME
      ),
      toolingPath: documentPath(SESSION_PROFILE_TOOLING_FILE_NAME),
      toolsPath: documentPath(SESSION_PROFILE_TOOLS_FILE_NAME),
    };
  }

  /**
   * Seeds the standard profile set exactly once: only when the profiles root
   * has no profile directories at all (first access, or a user-initiated
   * factory reset by deleting the root). Existing user files are never
   * touched, and deleting an individual seeded profile does not resurrect it.
   */
  async ensureSeededProfiles(): Promise<boolean> {
    const existing = await this.listProfileDirectoryIds();
    if (existing.length > 0) {
      return false;
    }
    for (const seed of SEED_SESSION_PROFILES) {
      const documents = this.resolveDocumentPaths(seed.id, {
        providerDirectory: seed.providerDirectory,
      });
      await fs.mkdir(documents.profileDirectory, { recursive: true });
      await fs.writeFile(documents.passportPath, seed.passportYaml, "utf8");
      await fs.writeFile(documents.promptPath, seed.promptBody, "utf8");
      if (seed.toolingYaml !== undefined) {
        await fs.writeFile(documents.toolingPath, seed.toolingYaml, "utf8");
      }
      if (seed.customInstructions !== undefined) {
        await fs.writeFile(
          documents.customInstructionsPath,
          seed.customInstructions,
          "utf8"
        );
      }
      if (seed.requestTemplateJson !== undefined) {
        await fs.writeFile(
          documents.requestTemplatePath,
          seed.requestTemplateJson,
          "utf8"
        );
      }
      if (seed.toolsJson !== undefined) {
        await fs.writeFile(documents.toolsPath, seed.toolsJson, "utf8");
      }
    }
    return true;
  }

  async listProfiles(): Promise<SessionProfileScanResult> {
    const profileIds = await this.listProfileDirectoryIds();
    const invalid: SessionProfileValidationFailure[] = [];
    const profiles: SessionProfile[] = [];
    for (const profileId of profileIds) {
      const result = await this.loadProfile(profileId);
      if (result.ok) {
        profiles.push(result.profile);
      } else {
        invalid.push(result.failure);
      }
    }
    return { invalid, profiles };
  }

  async loadProfile(profileId: string): Promise<SessionProfileLoadResult> {
    const profileRef = await this.findProfileDirectoryRef(profileId);
    const documents = profileRef
      ? this.resolveDocumentPathsForDirectory(profileRef.profileDirectory)
      : this.resolveDocumentPaths(profileId);
    const issues: string[] = [];
    const passportText = await readDocument(
      documents.passportPath,
      SESSION_PROFILE_PASSPORT_FILE_NAME,
      issues
    );
    const promptText = await readDocument(
      documents.promptPath,
      SESSION_PROFILE_PROMPT_FILE_NAME,
      issues
    );
    if (issues.length > 0) {
      return { failure: { documents, id: profileId, issues }, ok: false };
    }
    const passportResult = parseSessionProfilePassport(passportText ?? "");
    const promptResult = parseSessionProfilePromptBody(promptText ?? "");
    issues.push(...passportResult.issues, ...promptResult.issues);
    if (
      issues.length > 0 ||
      !passportResult.passport ||
      promptResult.promptBody === undefined
    ) {
      return { failure: { documents, id: profileId, issues }, ok: false };
    }
    const tooling = await this.loadProfileTooling(
      documents,
      passportResult.passport,
      issues
    );
    const nativeRequest = await this.loadNativeRequestBundle(documents, issues);
    if (issues.length > 0) {
      return { failure: { documents, id: profileId, issues }, ok: false };
    }
    return {
      ok: true,
      profile: {
        documents,
        id: profileId,
        ...(nativeRequest ? { nativeRequest } : {}),
        passport: passportResult.passport,
        promptBody: promptResult.promptBody,
        scope: resolveSessionProfileScope(passportResult.passport),
        tooling,
      },
    };
  }

  /**
   * Watches the profiles root for file changes (best-effort: an unwatchable
   * root never crashes Core). The root is created first so the watcher works
   * before first-access seeding. Returns an unsubscribe that closes the
   * watcher and drops any pending debounced notification.
   */
  watchProfiles(listener: () => void): () => void {
    let debounceTimer: NodeJS.Timeout | null = null;
    let watcher: FSWatcher | null = null;
    try {
      mkdirSync(this.profilesRootDirectory, { recursive: true });
      watcher = watchDirectory(
        this.profilesRootDirectory,
        { recursive: true },
        () => {
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(() => {
            debounceTimer = null;
            listener();
          }, PROFILE_WATCH_DEBOUNCE_MS);
        }
      );
      watcher.on("error", () => undefined);
    } catch {
      watcher = null;
    }
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      watcher?.close();
      watcher = null;
    };
  }

  private async listProfileDirectoryIds(): Promise<string[]> {
    const refs = await this.listProfileDirectoryRefs();
    return refs.map((ref) => ref.id);
  }

  private async listProfileDirectoryRefs(): Promise<ProfileDirectoryRef[]> {
    try {
      const entries = await fs.readdir(this.profilesRootDirectory, {
        withFileTypes: true,
      });
      const rootRefs: ProfileDirectoryRef[] = [];
      const providerRefs: ProfileDirectoryRef[] = [];
      for (const entry of entries) {
        if (!(entry.isDirectory() && !entry.name.startsWith("."))) {
          continue;
        }
        const entryDirectory = path.join(
          this.profilesRootDirectory,
          entry.name
        );
        if (await hasProfilePassport(entryDirectory)) {
          rootRefs.push({ id: entry.name, profileDirectory: entryDirectory });
          continue;
        }
        const providerEntries = await safeReadDirectory(entryDirectory);
        for (const providerEntry of providerEntries) {
          if (
            !(
              providerEntry.isDirectory() && !providerEntry.name.startsWith(".")
            )
          ) {
            continue;
          }
          const profileDirectory = path.join(
            entryDirectory,
            providerEntry.name
          );
          if (await hasProfilePassport(profileDirectory)) {
            providerRefs.push({
              id: providerEntry.name,
              profileDirectory,
              providerDirectory: entry.name,
            });
          }
        }
      }
      const refsById = new Map<string, ProfileDirectoryRef>();
      for (const ref of rootRefs) {
        refsById.set(ref.id, ref);
      }
      for (const ref of providerRefs) {
        refsById.set(ref.id, ref);
      }
      return [...refsById.values()].sort((left, right) =>
        left.id.localeCompare(right.id)
      );
    } catch {
      return [];
    }
  }

  private async findProfileDirectoryRef(
    profileId: string
  ): Promise<ProfileDirectoryRef | undefined> {
    const refs = await this.listProfileDirectoryRefs();
    return refs.find((ref) => ref.id === profileId);
  }

  private async loadNativeRequestBundle(
    documents: SessionProfileDocumentPaths,
    issues: string[]
  ): Promise<SessionProfileNativeRequestBundle | undefined> {
    const [customInstructions, requestTemplateText, toolsText] =
      await Promise.all([
        readOptionalDocument(documents.customInstructionsPath),
        readOptionalDocument(documents.requestTemplatePath),
        readOptionalDocument(documents.toolsPath),
      ]);
    const bundle: MutableSessionProfileNativeRequestBundle = {};
    if (customInstructions?.trim()) {
      bundle.customInstructions = customInstructions;
    }
    if (requestTemplateText !== undefined) {
      const parsed = parseSessionProfileJsonDocument(
        requestTemplateText,
        SESSION_PROFILE_REQUEST_TEMPLATE_FILE_NAME
      );
      issues.push(...parsed.issues);
      if (isPlainRecord(parsed.value)) {
        bundle.requestTemplate = parsed.value;
      } else if (parsed.value !== undefined) {
        issues.push(
          `${SESSION_PROFILE_REQUEST_TEMPLATE_FILE_NAME}: root value must be an object.`
        );
      }
    }
    if (toolsText !== undefined) {
      const parsed = parseSessionProfileJsonDocument(
        toolsText,
        SESSION_PROFILE_TOOLS_FILE_NAME
      );
      issues.push(...parsed.issues);
      if (
        Array.isArray(parsed.value) &&
        parsed.value.every((item) => isPlainRecord(item))
      ) {
        bundle.tools = parsed.value;
      } else if (parsed.value !== undefined) {
        issues.push(
          `${SESSION_PROFILE_TOOLS_FILE_NAME}: root value must be an array of objects.`
        );
      }
    }
    return Object.keys(bundle).length > 0 ? bundle : undefined;
  }

  private async loadProfileTooling(
    documents: SessionProfileDocumentPaths,
    passport: SessionProfilePassport,
    issues: string[]
  ): Promise<SessionProfileTooling> {
    if (passport.provider === "codex") {
      return buildDefaultSessionProfileTooling();
    }
    const toolingText = await readDocument(
      documents.toolingPath,
      SESSION_PROFILE_TOOLING_FILE_NAME,
      issues
    );
    const toolingResult = parseSessionProfileTooling(toolingText ?? "");
    issues.push(...toolingResult.issues);
    return toolingResult.tooling ?? buildDefaultSessionProfileTooling();
  }
}

async function readDocument(
  filePath: string,
  fileLabel: string,
  issues: string[]
): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    issues.push(`${fileLabel}: file is missing or unreadable.`);
    return;
  }
}

async function readOptionalDocument(
  filePath: string
): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }
}

async function safeReadDirectory(directoryPath: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function hasProfilePassport(profileDirectory: string): Promise<boolean> {
  try {
    await fs.access(
      path.join(profileDirectory, SESSION_PROFILE_PASSPORT_FILE_NAME)
    );
    return true;
  } catch {
    return false;
  }
}

function buildDefaultSessionProfileTooling(): SessionProfileTooling {
  type ToolingCategory = (typeof SESSION_PROFILE_TOOLING_CATEGORIES)[number];
  const categories = {} as Record<ToolingCategory, boolean>;
  for (const category of SESSION_PROFILE_TOOLING_CATEGORIES) {
    categories[category] = true;
  }
  return { categories };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function harnessHome(): string {
  return (
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai")
  );
}
