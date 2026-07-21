import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ProfileAuthoringFacade,
  StudioProfileDraftSnapshot,
} from "../../../../session-profiles/modules/profile-authoring/src/profile-authoring-facade.js";
import type { ProfileMaterializerFacade } from "../../../../session-profiles/modules/profile-materializer/src/profile-materializer-facade.js";
import type {
  ProfileStoreFacade,
  SessionProfile,
  SessionProfileNativeCaptureDonorReference,
  SessionProfileStudioPassport,
} from "../../../../session-profiles/modules/profile-store/src/profile-store-facade.js";

export type ProfileStudioProviderId = "claude" | "codex" | "kimi-client";

export interface ProfileStudioProfile {
  readonly approvedAt: string | null;
  readonly approvedContentHash: string | null;
  readonly contentHash: string;
  readonly createdAt: string;
  readonly creatorSessionId: string;
  readonly description: string;
  readonly lifecycleStatus: "draft" | "valid";
  readonly name: string;
  readonly nativeCaptureDonor: SessionProfileNativeCaptureDonorReference | null;
  readonly profileId: string;
  readonly purpose: string;
  readonly target: {
    readonly modelId: string;
    readonly providerId: ProfileStudioProviderId;
  };
  readonly updatedAt: string;
}

export type ProfileStudioLifecycleResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly profile: ProfileStudioProfile };

export type ProfileStudioDeleteResult =
  | { readonly error: string; readonly ok: false }
  | {
      readonly creatorSessionId: string;
      readonly ok: true;
      readonly profileId: string;
    };

interface ProfileStudioLifecycleFacadeOptions {
  readonly idFactory?: () => string;
  readonly profileAuthoring: Pick<
    ProfileAuthoringFacade,
    "createStudioDraft" | "markStudioDraftValid" | "updateStudioDraft"
  >;
  readonly profileMaterializer: Pick<ProfileMaterializerFacade, "materialize">;
  readonly profileStore: Pick<
    ProfileStoreFacade,
    "listProfiles" | "loadProfile" | "rootDirectory"
  >;
}

const MATERIALIZATION_DATE = new Date(0);

export class ProfileStudioLifecycleFacade {
  private readonly idFactory: () => string;
  private readonly profileAuthoring: ProfileStudioLifecycleFacadeOptions["profileAuthoring"];
  private readonly profileMaterializer: ProfileStudioLifecycleFacadeOptions["profileMaterializer"];
  private readonly profileStore: ProfileStudioLifecycleFacadeOptions["profileStore"];

  constructor(options: ProfileStudioLifecycleFacadeOptions) {
    this.idFactory = options.idFactory ?? randomUUID;
    this.profileAuthoring = options.profileAuthoring;
    this.profileMaterializer = options.profileMaterializer;
    this.profileStore = options.profileStore;
  }

  async createDraft(request: {
    readonly creatorSessionId: string;
    readonly modelId: string;
    readonly providerId: ProfileStudioProviderId;
  }): Promise<ProfileStudioLifecycleResult> {
    const creatorSessionId = request.creatorSessionId.trim();
    const modelId = request.modelId.trim();
    if (!(creatorSessionId && modelId)) {
      return {
        error: "Creator session id and target model must not be empty.",
        ok: false,
      };
    }
    const profileId = `draft-${this.idFactory()}`.toLowerCase();
    const created = await this.profileAuthoring.createStudioDraft({
      creatorSessionId,
      model: modelId,
      profileId,
      provider: request.providerId,
    });
    if (!created.ok) {
      return created;
    }
    return this.getProfile(profileId);
  }

  async applyDraftSnapshot(request: {
    readonly profileId: string;
    readonly snapshot: StudioProfileDraftSnapshot;
  }): Promise<ProfileStudioLifecycleResult> {
    const updated = await this.profileAuthoring.updateStudioDraft(request);
    if (!updated.ok) {
      return updated;
    }
    return this.getProfile(request.profileId);
  }

  async approveDraft(request: {
    readonly contentHash: string;
    readonly profileId: string;
  }): Promise<ProfileStudioLifecycleResult> {
    const loaded = await this.loadStudioProfile(request.profileId);
    if (!loaded.ok) {
      return loaded;
    }
    if (loaded.profile.passport.status !== "draft") {
      return {
        error: `Profile "${request.profileId}" is already Valid.`,
        ok: false,
      };
    }
    if (
      !(
        loaded.profile.promptBody.trim() &&
        loaded.profile.customInstructionsBody.trim()
      )
    ) {
      return {
        error: "Both Studio prompt parts must be complete before approval.",
        ok: false,
      };
    }
    const contentHash = this.materializeHash(loaded.profile);
    if (contentHash !== request.contentHash.trim()) {
      return {
        error: "Profile content changed; approve the current content hash.",
        ok: false,
      };
    }
    const approved = await this.profileAuthoring.markStudioDraftValid(
      request.profileId
    );
    if (!approved.ok) {
      return approved;
    }
    return this.getProfile(request.profileId);
  }

  async deleteProfile(profileId: string): Promise<ProfileStudioDeleteResult> {
    const loaded = await this.loadStudioProfile(profileId);
    if (!loaded.ok) {
      return loaded;
    }
    const creatorSessionId = loaded.profile.passport.creatorSessionId;
    const profileDirectory = loaded.profile.documents.profileDirectory;
    const relativeDirectory = path.relative(
      this.profileStore.rootDirectory,
      profileDirectory
    );
    if (
      !relativeDirectory ||
      relativeDirectory.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeDirectory)
    ) {
      return {
        error: `Studio profile "${profileId}" is outside the profiles root.`,
        ok: false,
      };
    }
    try {
      await fs.rm(profileDirectory, { recursive: true });
      return { creatorSessionId, ok: true, profileId };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { error: `Could not delete Studio profile: ${reason}`, ok: false };
    }
  }

  async getProfile(profileId: string): Promise<ProfileStudioLifecycleResult> {
    const loaded = await this.loadStudioProfile(profileId);
    if (!loaded.ok) {
      return loaded;
    }
    const profile = loaded.profile;
    const contentHash = this.materializeHash(profile);
    const timestamps = await readProfileTimestamps(
      profile.documents.profileDirectory,
      profile.documents.passportPath
    );
    return {
      ok: true,
      profile: {
        approvedAt:
          profile.passport.status === "valid" ? timestamps.updatedAt : null,
        approvedContentHash:
          profile.passport.status === "valid" ? contentHash : null,
        contentHash,
        createdAt: timestamps.createdAt,
        creatorSessionId: profile.passport.creatorSessionId,
        description: profile.passport.description,
        lifecycleStatus: profile.passport.status,
        name: profile.passport.name,
        nativeCaptureDonor: profile.passport.nativeCaptureDonor,
        profileId: profile.id,
        purpose: profile.passport.purpose,
        target: {
          modelId: profile.passport.model,
          providerId: profile.passport.provider,
        },
        updatedAt: timestamps.updatedAt,
      },
    };
  }

  async getProfileIdForCreatorSession(
    creatorSessionId: string
  ): Promise<string | null> {
    const normalizedSessionId = creatorSessionId.trim();
    if (!normalizedSessionId) {
      return null;
    }
    const scan = await this.profileStore.listProfiles();
    const match = scan.profiles.find(
      (profile) =>
        isStudioProfile(profile) &&
        profile.passport.creatorSessionId === normalizedSessionId
    );
    return match?.id ?? null;
  }

  private materializeHash(profile: SessionProfile): string {
    return this.profileMaterializer.materialize(profile, {
      sessionStartDate: MATERIALIZATION_DATE,
    }).contentHash;
  }

  private async loadStudioProfile(profileId: string): Promise<
    | { readonly error: string; readonly ok: false }
    | {
        readonly ok: true;
        readonly profile: SessionProfile & {
          readonly passport: SessionProfileStudioPassport & {
            readonly provider: ProfileStudioProviderId;
          };
        };
      }
  > {
    const loaded = await this.profileStore.loadProfile(profileId);
    if (!(loaded.ok && isStudioProfile(loaded.profile))) {
      return {
        error: `Studio profile "${profileId}" was not found.`,
        ok: false,
      };
    }
    return { ok: true, profile: loaded.profile };
  }
}

function isStudioProfile(profile: SessionProfile): profile is SessionProfile & {
  readonly passport: SessionProfileStudioPassport & {
    readonly provider: ProfileStudioProviderId;
  };
} {
  return (
    "schemaVersion" in profile.passport &&
    profile.passport.schemaVersion === 2 &&
    isStudioProviderId(profile.passport.provider)
  );
}

function isStudioProviderId(value: string): value is ProfileStudioProviderId {
  return value === "claude" || value === "codex" || value === "kimi-client";
}

async function readProfileTimestamps(
  profileDirectory: string,
  passportPath: string
): Promise<{ readonly createdAt: string; readonly updatedAt: string }> {
  const [directoryStat, passportStat] = await Promise.all([
    fs.stat(profileDirectory),
    fs.stat(passportPath),
  ]);
  return {
    createdAt: directoryStat.birthtime.toISOString(),
    updatedAt: passportStat.mtime.toISOString(),
  };
}
