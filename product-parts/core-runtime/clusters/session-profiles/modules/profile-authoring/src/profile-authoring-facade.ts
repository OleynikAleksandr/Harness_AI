import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { stringify as stringifyYaml } from "yaml";
import {
  isSessionProfileStudioPassport,
  type ProfileStoreFacade,
  SESSION_PROFILE_CUSTOM_INSTRUCTIONS_FILE_NAME,
  SESSION_PROFILE_PASSPORT_FILE_NAME,
  SESSION_PROFILE_PROMPT_FILE_NAME,
  SESSION_PROFILE_TOOLS_FILE_NAME,
  type SessionProfileDocumentPaths,
  type SessionProfileNativeCaptureDonorReference,
} from "../../profile-store/src/profile-store-facade.js";

export interface CreateSessionProfileRequest {
  readonly name: string;
  readonly provider: string;
}

export type CreateSessionProfileResult =
  | {
      readonly documents: SessionProfileDocumentPaths;
      readonly id: string;
      readonly ok: true;
    }
  | { readonly error: string; readonly ok: false };

export interface CreateStudioProfileDraftRequest {
  readonly creatorSessionId: string;
  readonly description?: string;
  readonly model: string;
  readonly name?: string;
  readonly profileId: string;
  readonly provider: "claude" | "codex" | "kimi-client";
  readonly purpose?: string;
}

export interface StudioProfileDraftSnapshot {
  readonly customInstructions: string;
  readonly description: string;
  readonly name: string;
  readonly nativeCaptureDonor: SessionProfileNativeCaptureDonorReference | null;
  readonly purpose: string;
  readonly systemPrompt: string;
  readonly tools: readonly Readonly<Record<string, unknown>>[] | null;
}

export interface UpdateStudioProfileDraftRequest {
  readonly profileId: string;
  readonly snapshot: StudioProfileDraftSnapshot;
}

export type StudioProfileAuthoringResult =
  | {
      readonly documents: SessionProfileDocumentPaths;
      readonly id: string;
      readonly ok: true;
    }
  | { readonly error: string; readonly ok: false };

interface ProfileAuthoringFacadeOptions {
  readonly profileStore: ProfileStoreFacade;
}

const ID_SEPARATOR_PATTERN = /[^\p{Letter}\p{Number}]+/gu;
const ID_TRIM_PATTERN = /^-+|-+$/gu;
const STUDIO_PROFILE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const STUDIO_PROVIDER_DIRECTORIES = {
  claude: "Claude",
  codex: "Codex",
  "kimi-client": "Kimi",
} as const;

export class ProfileAuthoringFacade {
  private readonly profileStore: ProfileStoreFacade;

  constructor(options: ProfileAuthoringFacadeOptions) {
    this.profileStore = options.profileStore;
  }

  /**
   * Creates a new profile directory from the document templates. Template
   * output is valid by construction; validity after external editing is the
   * store's scan-time status, never a one-time act here.
   */
  async createProfile(
    request: CreateSessionProfileRequest
  ): Promise<CreateSessionProfileResult> {
    const name = request.name.trim();
    if (!name) {
      return { error: "Profile name must not be empty.", ok: false };
    }
    const provider = request.provider?.trim();
    if (!provider) {
      return { error: "Profile provider must not be empty.", ok: false };
    }
    const id = deriveProfileId(name);
    if (!id) {
      return {
        error: `Cannot derive a directory id from the profile name "${name}".`,
        ok: false,
      };
    }
    const documents = this.profileStore.resolveDocumentPaths(id);
    if (await pathExists(documents.profileDirectory)) {
      return {
        error: `A profile with the id "${id}" already exists.`,
        ok: false,
      };
    }
    await fs.mkdir(documents.profileDirectory, { recursive: true });
    await fs.writeFile(
      documents.passportPath,
      buildPassportTemplate(name, provider),
      "utf8"
    );
    await fs.writeFile(documents.promptPath, buildPromptTemplate(name), "utf8");
    await fs.writeFile(documents.toolingPath, buildToolingTemplate(), "utf8");
    return { documents, id, ok: true };
  }

  async createStudioDraft(
    request: CreateStudioProfileDraftRequest
  ): Promise<StudioProfileAuthoringResult> {
    const profileId = request.profileId.trim();
    const model = request.model.trim();
    const creatorSessionId = request.creatorSessionId.trim();
    if (!STUDIO_PROFILE_ID_PATTERN.test(profileId)) {
      return {
        error: "Studio profile id must be a safe kebab-case id.",
        ok: false,
      };
    }
    if (!(model && creatorSessionId)) {
      return {
        error: "Studio model and creator session id must not be empty.",
        ok: false,
      };
    }
    const documents = this.profileStore.resolveDocumentPaths(profileId, {
      providerDirectory: STUDIO_PROVIDER_DIRECTORIES[request.provider],
    });
    if (await pathExists(documents.profileDirectory)) {
      return {
        error: `A profile with the id "${profileId}" already exists.`,
        ok: false,
      };
    }
    const passport = buildStudioPassport({
      creatorSessionId,
      description: request.description?.trim() ?? "",
      model,
      name: request.name?.trim() || "New Profile",
      nativeCaptureDonor: null,
      provider: request.provider,
      purpose: request.purpose?.trim() ?? "",
    });
    try {
      await replaceStudioDirectory(
        documents.profileDirectory,
        { customInstructions: "", passport, systemPrompt: "", tools: null },
        false
      );
      return { documents, id: profileId, ok: true };
    } catch (error) {
      return { error: describeWriteFailure(error), ok: false };
    }
  }

  async updateStudioDraft(
    request: UpdateStudioProfileDraftRequest
  ): Promise<StudioProfileAuthoringResult> {
    const snapshotIssue = validateStudioSnapshot(request.snapshot);
    if (snapshotIssue) {
      return { error: snapshotIssue, ok: false };
    }
    const loaded = await this.profileStore.loadProfile(request.profileId);
    if (!loaded.ok) {
      return {
        error: `Studio profile "${request.profileId}" does not exist or is invalid.`,
        ok: false,
      };
    }
    const loadedPassport = loaded.profile.passport;
    if (
      !(
        isSessionProfileStudioPassport(loadedPassport) &&
        isStudioProviderId(loadedPassport.provider)
      )
    ) {
      return {
        error: `Studio profile "${request.profileId}" does not exist or is invalid.`,
        ok: false,
      };
    }
    const passport = buildStudioPassport({
      creatorSessionId: loadedPassport.creatorSessionId,
      description: request.snapshot.description,
      model: loadedPassport.model,
      name: request.snapshot.name.trim(),
      nativeCaptureDonor: request.snapshot.nativeCaptureDonor,
      provider: loadedPassport.provider,
      purpose: request.snapshot.purpose.trim(),
    });
    try {
      await replaceStudioDirectory(
        loaded.profile.documents.profileDirectory,
        {
          customInstructions: request.snapshot.customInstructions,
          passport,
          systemPrompt: request.snapshot.systemPrompt,
          tools: request.snapshot.tools,
        },
        true
      );
      return {
        documents: loaded.profile.documents,
        id: request.profileId,
        ok: true,
      };
    } catch (error) {
      return { error: describeWriteFailure(error), ok: false };
    }
  }

  /** Document paths for the "edit in VS Code" action. */
  resolveDocumentPaths(profileId: string): SessionProfileDocumentPaths {
    return this.profileStore.resolveDocumentPaths(profileId);
  }
}

export function deriveProfileId(name: string): string {
  return name
    .toLowerCase()
    .replace(ID_SEPARATOR_PATTERN, "-")
    .replace(ID_TRIM_PATTERN, "");
}

function buildPassportTemplate(name: string, provider: string): string {
  const lines = [
    "# Session profile passport. Shown in the profile picker.",
    `name: ${name}`,
    'description: ""',
    "# Provider-scoped profile: offered only to this provider.",
    `provider: ${provider}`,
  ];
  return `${lines.join("\n")}\n`;
}

function buildPromptTemplate(name: string): string {
  return `# ${name}

Write the system prompt of this profile here. The entire file body becomes
the workflow layer of the session's system prompt.

Guidance:

- Describe the task, the working rules, and the output discipline.
- Speak in action categories ("read files", "search the code", "run the
  tests"), never in provider-native tool names.
- The Harness system wrapper (workspace path, session date, language
  contract) is appended automatically; do not duplicate it here.
`;
}

function buildToolingTemplate(): string {
  return `# Tooling categories for this profile.
# on  = the adapter enables its native tools of this category
# off = the adapter removes/disables them
# Unknown keys are validation errors; omitted categories default to on.
categories:
  file-read: on
  file-write: on
  shell: on
  web: on
  git: on
  tests: on
`;
}

interface StudioPassportTemplate {
  readonly creatorSessionId: string;
  readonly description: string;
  readonly model: string;
  readonly name: string;
  readonly nativeCaptureDonor: SessionProfileNativeCaptureDonorReference | null;
  readonly provider: "claude" | "codex" | "kimi-client";
  readonly purpose: string;
}

interface StudioDirectorySnapshot {
  readonly customInstructions: string;
  readonly passport: string;
  readonly systemPrompt: string;
  readonly tools: readonly Readonly<Record<string, unknown>>[] | null;
}

function buildStudioPassport(template: StudioPassportTemplate): string {
  return stringifyYaml({
    schemaVersion: 2,
    authoring: "profile-studio",
    name: template.name,
    description: template.description,
    purpose: template.purpose,
    provider: template.provider,
    model: template.model,
    status: "draft",
    creatorSessionId: template.creatorSessionId,
    nativeCaptureDonor: template.nativeCaptureDonor,
  });
}

function validateStudioSnapshot(
  snapshot: StudioProfileDraftSnapshot
): string | undefined {
  if (!snapshot.name.trim()) {
    return "Studio profile name must not be empty.";
  }
  if (
    typeof snapshot.description !== "string" ||
    typeof snapshot.purpose !== "string" ||
    typeof snapshot.systemPrompt !== "string" ||
    typeof snapshot.customInstructions !== "string"
  ) {
    return "Studio profile text fields must be strings.";
  }
  if (
    snapshot.tools !== null &&
    !(
      Array.isArray(snapshot.tools) &&
      snapshot.tools.every((tool) => isPlainRecord(tool))
    )
  ) {
    return "Studio profile tools must be null or an array of objects.";
  }
  return;
}

async function replaceStudioDirectory(
  profileDirectory: string,
  snapshot: StudioDirectorySnapshot,
  replaceExisting: boolean
): Promise<void> {
  const parentDirectory = path.dirname(profileDirectory);
  const profileDirectoryName = path.basename(profileDirectory);
  await fs.mkdir(parentDirectory, { recursive: true });
  const stagingDirectory = await fs.mkdtemp(
    path.join(parentDirectory, `.${profileDirectoryName}.staging-`)
  );
  let stagingExists = true;
  try {
    await writeStudioDirectory(stagingDirectory, snapshot);
    if (!replaceExisting) {
      await fs.rename(stagingDirectory, profileDirectory);
      stagingExists = false;
      return;
    }
    const backupDirectory = path.join(
      parentDirectory,
      `.${profileDirectoryName}.backup-${randomUUID()}`
    );
    await fs.rename(profileDirectory, backupDirectory);
    try {
      await fs.rename(stagingDirectory, profileDirectory);
      stagingExists = false;
    } catch (error) {
      await fs.rename(backupDirectory, profileDirectory);
      throw error;
    }
    await fs.rm(backupDirectory, { force: true, recursive: true });
  } finally {
    if (stagingExists) {
      await fs.rm(stagingDirectory, { force: true, recursive: true });
    }
  }
}

async function writeStudioDirectory(
  directory: string,
  snapshot: StudioDirectorySnapshot
): Promise<void> {
  await Promise.all([
    fs.writeFile(
      path.join(directory, SESSION_PROFILE_PASSPORT_FILE_NAME),
      snapshot.passport,
      "utf8"
    ),
    fs.writeFile(
      path.join(directory, SESSION_PROFILE_PROMPT_FILE_NAME),
      snapshot.systemPrompt,
      "utf8"
    ),
    fs.writeFile(
      path.join(directory, SESSION_PROFILE_CUSTOM_INSTRUCTIONS_FILE_NAME),
      snapshot.customInstructions,
      "utf8"
    ),
    ...(snapshot.tools === null
      ? []
      : [
          fs.writeFile(
            path.join(directory, SESSION_PROFILE_TOOLS_FILE_NAME),
            `${JSON.stringify(snapshot.tools, null, 2)}\n`,
            "utf8"
          ),
        ]),
  ]);
}

function describeWriteFailure(error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `Could not write Studio profile atomically: ${reason}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStudioProviderId(
  value: string
): value is keyof typeof STUDIO_PROVIDER_DIRECTORIES {
  return Object.hasOwn(STUDIO_PROVIDER_DIRECTORIES, value);
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}
