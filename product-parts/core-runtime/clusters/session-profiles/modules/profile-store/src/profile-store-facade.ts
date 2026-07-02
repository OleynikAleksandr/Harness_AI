import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  parseSessionProfilePassport,
  parseSessionProfilePromptBody,
  parseSessionProfileTooling,
  resolveSessionProfileScope,
  type SessionProfilePassport,
  type SessionProfileScope,
  type SessionProfileTooling,
} from "./profile-document-parser.js";

export {
  resolveSessionProfileScope,
  SESSION_PROFILE_TOOLING_CATEGORIES,
  type SessionProfilePassport,
  type SessionProfileScope,
  type SessionProfileTooling,
  type SessionProfileToolingCategory,
} from "./profile-document-parser.js";

export const SESSION_PROFILE_PASSPORT_FILE_NAME = "profile.yaml";
export const SESSION_PROFILE_PROMPT_FILE_NAME = "system-prompt.md";
export const SESSION_PROFILE_TOOLING_FILE_NAME = "tooling.yaml";
export const SESSION_PROFILES_ROOT_DIRECTORY_NAME = "Profiles";

export interface SessionProfileDocumentPaths {
  readonly passportPath: string;
  readonly profileDirectory: string;
  readonly promptPath: string;
  readonly toolingPath: string;
}

export interface SessionProfile {
  readonly documents: SessionProfileDocumentPaths;
  readonly id: string;
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

  resolveDocumentPaths(profileId: string): SessionProfileDocumentPaths {
    const profileDirectory = path.join(this.profilesRootDirectory, profileId);
    return {
      passportPath: path.join(
        profileDirectory,
        SESSION_PROFILE_PASSPORT_FILE_NAME
      ),
      profileDirectory,
      promptPath: path.join(profileDirectory, SESSION_PROFILE_PROMPT_FILE_NAME),
      toolingPath: path.join(
        profileDirectory,
        SESSION_PROFILE_TOOLING_FILE_NAME
      ),
    };
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
    const documents = this.resolveDocumentPaths(profileId);
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
    const toolingText = await readDocument(
      documents.toolingPath,
      SESSION_PROFILE_TOOLING_FILE_NAME,
      issues
    );
    if (issues.length > 0) {
      return { failure: { documents, id: profileId, issues }, ok: false };
    }
    const passportResult = parseSessionProfilePassport(passportText ?? "");
    const promptResult = parseSessionProfilePromptBody(promptText ?? "");
    const toolingResult = parseSessionProfileTooling(toolingText ?? "");
    issues.push(
      ...passportResult.issues,
      ...promptResult.issues,
      ...toolingResult.issues
    );
    if (
      issues.length > 0 ||
      !(passportResult.passport && toolingResult.tooling) ||
      promptResult.promptBody === undefined
    ) {
      return { failure: { documents, id: profileId, issues }, ok: false };
    }
    return {
      ok: true,
      profile: {
        documents,
        id: profileId,
        passport: passportResult.passport,
        promptBody: promptResult.promptBody,
        scope: resolveSessionProfileScope(passportResult.passport),
        tooling: toolingResult.tooling,
      },
    };
  }

  private async listProfileDirectoryIds(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.profilesRootDirectory, {
        withFileTypes: true,
      });
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
    } catch {
      return [];
    }
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

function harnessHome(): string {
  return (
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai")
  );
}
