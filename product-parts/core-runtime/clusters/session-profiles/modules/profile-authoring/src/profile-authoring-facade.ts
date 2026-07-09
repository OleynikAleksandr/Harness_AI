import { promises as fs } from "node:fs";
import type {
  ProfileStoreFacade,
  SessionProfileDocumentPaths,
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

interface ProfileAuthoringFacadeOptions {
  readonly profileStore: ProfileStoreFacade;
}

const ID_SEPARATOR_PATTERN = /[^\p{Letter}\p{Number}]+/gu;
const ID_TRIM_PATTERN = /^-+|-+$/gu;

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

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}
