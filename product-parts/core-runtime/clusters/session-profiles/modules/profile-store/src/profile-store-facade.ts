import { homedir } from "node:os";
import path from "node:path";

export const SESSION_PROFILE_PASSPORT_FILE_NAME = "profile.yaml";
export const SESSION_PROFILE_PROMPT_FILE_NAME = "system-prompt.md";
export const SESSION_PROFILE_TOOLING_FILE_NAME = "tooling.yaml";
export const SESSION_PROFILES_ROOT_DIRECTORY_NAME = "Profiles";

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

interface ProfileStoreFacadeOptions {
  readonly profilesRootDirectory?: string;
}

export function resolveSessionProfilesRootDirectory(): string {
  return path.join(harnessHome(), SESSION_PROFILES_ROOT_DIRECTORY_NAME);
}

export function resolveSessionProfileScope(
  passport: SessionProfilePassport
): SessionProfileScope {
  return passport.provider?.trim() ? "individual" : "universal";
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
}

function harnessHome(): string {
  return (
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai")
  );
}
