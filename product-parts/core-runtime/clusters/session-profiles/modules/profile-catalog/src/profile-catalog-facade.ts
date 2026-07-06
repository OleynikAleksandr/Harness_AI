import type {
  ProfileStoreFacade,
  SessionProfile,
} from "../../profile-store/src/profile-store-facade.js";

export const NATIVE_SESSION_PROFILE_ID = "native";

/**
 * Providers whose adapters apply managed session profiles in the MVP scope.
 * CodexUC is Codex-family: it can apply Codex individual profiles through the
 * OAuth Responses-compatible route. The remaining universal-client endpoints
 * stay Native-only until Phase 5 adds their synthetic-native wrapper/profile
 * application layer. Retired ids such as kimi and glm-native are intentionally
 * absent.
 */
export const PROFILE_SUPPORTED_PROVIDER_IDS = [
  "claude",
  "codex",
  "codex-uc",
] as const;

export type SessionProfileCatalogEntryKind =
  | "individual"
  | "native"
  | "universal";

export interface SessionProfileCatalogEntry {
  readonly description: string;
  readonly id: string;
  readonly issues: readonly string[];
  readonly kind: SessionProfileCatalogEntryKind;
  readonly name: string;
  readonly provider?: string;
  readonly valid: boolean;
}

export type SessionProfileResolution =
  | {
      readonly kind: "managed";
      readonly ok: true;
      readonly profile: SessionProfile;
    }
  | { readonly kind: "native"; readonly ok: true }
  | { readonly error: string; readonly ok: false };

interface ProfileCatalogFacadeOptions {
  readonly profileStore: ProfileStoreFacade;
}

const NATIVE_CATALOG_ENTRY: SessionProfileCatalogEntry = {
  description:
    "The channel's default behavior with no Harness interference. Primary profile and fallback.",
  id: NATIVE_SESSION_PROFILE_ID,
  issues: [],
  kind: "native",
  name: "Native",
  valid: true,
};

export class ProfileCatalogFacade {
  private readonly profileStore: ProfileStoreFacade;

  constructor(options: ProfileCatalogFacadeOptions) {
    this.profileStore = options.profileStore;
  }

  /** All profiles for management surfaces (Profile Creator), Native first. */
  async listAllProfiles(): Promise<readonly SessionProfileCatalogEntry[]> {
    await this.profileStore.ensureSeededProfiles();
    const scan = await this.profileStore.listProfiles();
    return [
      NATIVE_CATALOG_ENTRY,
      ...scan.profiles.map(toCatalogEntry),
      ...scan.invalid.map(toInvalidCatalogEntry),
    ];
  }

  /** Applicable profiles for the session-creation picker, Native first. */
  async listProfilesForProvider(
    providerId: string
  ): Promise<readonly SessionProfileCatalogEntry[]> {
    const all = await this.listAllProfiles();
    if (!isProfileSupportedProvider(providerId)) {
      return [NATIVE_CATALOG_ENTRY];
    }
    return all.filter(
      (entry) =>
        entry.kind === "native" ||
        entry.kind === "universal" ||
        isProviderProfileApplicable(providerId, entry.provider)
    );
  }

  /**
   * Resolves the user's selection for session creation. No selection (or the
   * explicit native id) is the guaranteed Native fallback; a selected but
   * broken/inapplicable profile is a structured error, never a silent
   * fallback (docs/architecture/SessionProfiles.md, session start contract).
   */
  async resolveForSession(request: {
    readonly profileId?: string;
    readonly providerId: string;
  }): Promise<SessionProfileResolution> {
    const profileId = request.profileId?.trim();
    if (!profileId || profileId === NATIVE_SESSION_PROFILE_ID) {
      return { kind: "native", ok: true };
    }
    if (!isProfileSupportedProvider(request.providerId)) {
      return {
        error: `Provider "${request.providerId}" does not support managed session profiles yet; only Native is available.`,
        ok: false,
      };
    }
    await this.profileStore.ensureSeededProfiles();
    const result = await this.profileStore.loadProfile(profileId);
    if (!result.ok) {
      const issues = result.failure.issues.join(" ");
      const reason = issues || "profile directory not found.";
      return {
        error: `Session profile "${profileId}" cannot be applied: ${reason}`,
        ok: false,
      };
    }
    const profile = result.profile;
    if (
      profile.scope === "individual" &&
      !isProviderProfileApplicable(
        request.providerId,
        profile.passport.provider
      )
    ) {
      return {
        error: `Session profile "${profileId}" is an individual profile for provider "${profile.passport.provider}" and is not applicable to "${request.providerId}".`,
        ok: false,
      };
    }
    return { kind: "managed", ok: true, profile };
  }
}

export function isProfileSupportedProvider(providerId: string): boolean {
  return (PROFILE_SUPPORTED_PROVIDER_IDS as readonly string[]).includes(
    providerId
  );
}

function isProviderProfileApplicable(
  providerId: string,
  profileProvider: string | undefined
): boolean {
  if (!profileProvider) {
    return false;
  }
  if (profileProvider === providerId) {
    return true;
  }
  return providerId === "codex-uc" && profileProvider === "codex";
}

function toCatalogEntry(profile: SessionProfile): SessionProfileCatalogEntry {
  return {
    description: profile.passport.description,
    id: profile.id,
    issues: [],
    kind: profile.scope,
    name: profile.passport.name,
    ...(profile.passport.provider
      ? { provider: profile.passport.provider }
      : {}),
    valid: true,
  };
}

function toInvalidCatalogEntry(failure: {
  readonly id: string;
  readonly issues: readonly string[];
}): SessionProfileCatalogEntry {
  return {
    description: "",
    id: failure.id,
    issues: failure.issues,
    kind: "universal",
    name: failure.id,
    valid: false,
  };
}
