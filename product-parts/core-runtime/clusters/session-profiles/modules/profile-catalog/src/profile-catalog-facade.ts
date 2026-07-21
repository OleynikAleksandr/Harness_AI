import {
  isSessionProfileStudioPassport,
  type ProfileStoreFacade,
  type SessionProfile,
  type SessionProfileStudioLifecycleStatus,
} from "../../profile-store/src/profile-store-facade.js";

export const NATIVE_SESSION_PROFILE_ID = "native";

/**
 * Providers whose adapters are active in Core and can receive provider-scoped
 * managed session profiles. Retired ids such as kimi and glm-native are
 * intentionally absent.
 */
export const PROFILE_SUPPORTED_PROVIDER_IDS = [
  "claude",
  "codex",
  "grok",
  "kimi-client",
  "glm-client",
  "openrouter-client",
  "local-models-client",
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
  readonly model?: string;
  readonly name: string;
  readonly provider?: string;
  readonly studioStatus?: SessionProfileStudioLifecycleStatus;
  readonly valid: boolean;
}

export interface SessionProfileStudioCatalogEntry {
  readonly creatorSessionId: string;
  readonly description: string;
  readonly id: string;
  readonly model: string;
  readonly name: string;
  readonly provider: string;
  readonly purpose: string;
  readonly status: SessionProfileStudioLifecycleStatus;
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
    const scan = await this.profileStore.listProfiles();
    return [
      NATIVE_CATALOG_ENTRY,
      ...scan.profiles.map(toCatalogEntry),
      ...scan.invalid.map(toInvalidCatalogEntry),
    ];
  }

  /** Applicable profiles for the session-creation picker, Native first. */
  async listProfilesForProvider(
    providerId: string,
    modelId?: string
  ): Promise<readonly SessionProfileCatalogEntry[]> {
    const all = await this.listAllProfiles();
    if (!isProfileSupportedProvider(providerId)) {
      return [NATIVE_CATALOG_ENTRY];
    }
    return all.filter(
      (entry) =>
        entry.kind === "native" ||
        (isProviderProfileApplicable(providerId, entry.provider) &&
          isPickerCompatibleStudioEntry(entry, providerId, modelId))
    );
  }

  /** Studio-only profiles for one exact target; Native and legacy stay out. */
  async listStudioProfilesForTarget(request: {
    readonly modelId: string;
    readonly providerId: string;
  }): Promise<readonly SessionProfileStudioCatalogEntry[]> {
    const providerId = request.providerId.trim();
    const modelId = request.modelId.trim();
    if (!(providerId && modelId)) {
      return [];
    }
    const scan = await this.profileStore.listProfiles();
    return scan.profiles.flatMap((profile) => {
      const passport = profile.passport;
      if (
        !isSessionProfileStudioPassport(passport) ||
        passport.provider !== providerId ||
        passport.model !== modelId
      ) {
        return [];
      }
      return [toStudioCatalogEntry(profile)];
    });
  }

  /**
   * Resolves the user's selection for session creation. No selection (or the
   * explicit native id) is the guaranteed Native fallback; a selected but
   * broken/inapplicable profile is a structured error, never a silent
   * fallback (docs/architecture/SessionProfiles.md, session start contract).
   */
  async resolveForSession(request: {
    readonly modelId?: string;
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
    if (profile.scope !== "individual") {
      return {
        error: `Session profile "${profileId}" is a legacy universal profile and cannot be applied to provider "${request.providerId}". Create a provider-scoped profile instead.`,
        ok: false,
      };
    }
    if (
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
    if (isSessionProfileStudioPassport(profile.passport)) {
      if (request.providerId === "kimi-client") {
        return {
          error:
            "Kimi Studio profiles remain Draft-only until the universal client reaches 25/25 Native tool executor parity.",
          ok: false,
        };
      }
      if (profile.passport.status !== "valid") {
        return {
          error: `Studio profile "${profileId}" is Draft and cannot be applied to an ordinary session.`,
          ok: false,
        };
      }
      if (
        !request.modelId ||
        profile.passport.model !== request.modelId.trim()
      ) {
        return {
          error: `Studio profile "${profileId}" is for model "${profile.passport.model}" and requires that exact model selection.`,
          ok: false,
        };
      }
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
  return profileProvider === providerId;
}

function isPickerCompatibleStudioEntry(
  entry: SessionProfileCatalogEntry,
  providerId: string,
  modelId: string | undefined
): boolean {
  if (!entry.studioStatus) {
    return true;
  }
  return (
    providerId !== "kimi-client" &&
    entry.studioStatus === "valid" &&
    entry.model === modelId?.trim()
  );
}

function toCatalogEntry(profile: SessionProfile): SessionProfileCatalogEntry {
  const studioPassport = isSessionProfileStudioPassport(profile.passport)
    ? profile.passport
    : undefined;
  return {
    description: profile.passport.description,
    id: profile.id,
    issues: [],
    kind: profile.scope,
    name: profile.passport.name,
    ...(studioPassport ? { model: studioPassport.model } : {}),
    ...(profile.passport.provider
      ? { provider: profile.passport.provider }
      : {}),
    ...(studioPassport ? { studioStatus: studioPassport.status } : {}),
    valid: true,
  };
}

function toStudioCatalogEntry(
  profile: SessionProfile
): SessionProfileStudioCatalogEntry {
  if (!isSessionProfileStudioPassport(profile.passport)) {
    throw new Error(`Profile "${profile.id}" is not a Studio profile.`);
  }
  return {
    creatorSessionId: profile.passport.creatorSessionId,
    description: profile.passport.description,
    id: profile.id,
    model: profile.passport.model,
    name: profile.passport.name,
    provider: profile.passport.provider,
    purpose: profile.passport.purpose,
    status: profile.passport.status,
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
    kind: "individual",
    name: failure.id,
    valid: false,
  };
}
