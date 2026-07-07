import type { SessionProfilePayload } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { ProfileCatalogFacade } from "../../../../session-profiles/modules/profile-catalog/src/profile-catalog-facade.js";
import { ProfileMaterializerFacade } from "../../../../session-profiles/modules/profile-materializer/src/profile-materializer-facade.js";
import { ProfileStoreFacade } from "../../../../session-profiles/modules/profile-store/src/profile-store-facade.js";
import { rememberLastSelectedProfile } from "../../../../settings-and-localization/modules/settings-store/src/session-profile-memory.js";
import type { NextSessionMode } from "./next-session-mode.js";
import type { AppliedProfileSnapshot } from "./session-request-handler-types.js";

export interface SessionProfileResolverLike {
  resolveAppliedProfile(request: {
    readonly nextSessionMode: NextSessionMode;
    readonly providerId: string;
    readonly workspacePath?: string;
  }): Promise<
    | { readonly appliedProfile: AppliedProfileSnapshot; readonly ok: true }
    | { readonly error: string; readonly ok: false }
  >;
}

const NATIVE_APPLIED_PROFILE: AppliedProfileSnapshot = {
  kind: "native",
  profileId: "native",
  profileName: "Native",
};

/**
 * Resolves the user's next-session-mode selection into the immutable applied
 * profile snapshot at create: no/native selection is the guaranteed Native
 * fallback, a selected but broken/inapplicable profile is a structured error
 * (never a silent fallback), and a managed selection freezes the fully
 * materialized prompt + tooling categories + content hash.
 */
export class SessionProfileResolver implements SessionProfileResolverLike {
  private readonly catalog: ProfileCatalogFacade;
  private readonly materializer: ProfileMaterializerFacade;

  constructor(options?: {
    readonly catalog?: ProfileCatalogFacade;
    readonly materializer?: ProfileMaterializerFacade;
  }) {
    this.catalog =
      options?.catalog ??
      new ProfileCatalogFacade({ profileStore: new ProfileStoreFacade() });
    this.materializer =
      options?.materializer ?? new ProfileMaterializerFacade();
  }

  async resolveAppliedProfile(request: {
    readonly nextSessionMode: NextSessionMode;
    readonly providerId: string;
    readonly workspacePath?: string;
  }): Promise<
    | { readonly appliedProfile: AppliedProfileSnapshot; readonly ok: true }
    | { readonly error: string; readonly ok: false }
  > {
    const { nextSessionMode } = request;
    if (
      nextSessionMode.invocationMode !== "managed" ||
      !nextSessionMode.managedProfileId
    ) {
      this.rememberSelection(request.providerId, "native");
      return { appliedProfile: NATIVE_APPLIED_PROFILE, ok: true };
    }
    const resolution = await this.catalog.resolveForSession({
      profileId: nextSessionMode.managedProfileId,
      providerId: request.providerId,
    });
    if (!resolution.ok) {
      return { error: resolution.error, ok: false };
    }
    if (resolution.kind === "native") {
      this.rememberSelection(request.providerId, "native");
      return { appliedProfile: NATIVE_APPLIED_PROFILE, ok: true };
    }
    this.rememberSelection(request.providerId, resolution.profile.id);
    const payload = this.materializer.materialize(resolution.profile, {
      sessionStartDate: new Date(),
      workspacePath: request.workspacePath,
    });
    return {
      appliedProfile: {
        contentHash: payload.contentHash,
        kind: "managed",
        profileId: payload.profileId,
        profileName: payload.profileName,
        prompt: payload.prompt,
        ...(payload.requestTemplate
          ? { requestTemplate: payload.requestTemplate }
          : {}),
        ...(payload.tools ? { tools: payload.tools } : {}),
        toolingCategories: payload.toolingCategories,
      },
      ok: true,
    };
  }

  // Fire-and-forget settings memory: the picker preselection must never be
  // able to fail a session create.
  private rememberSelection(providerId: string, profileId: string): void {
    rememberLastSelectedProfile(providerId, profileId).catch(() => undefined);
  }
}

/**
 * Records the adapter's provider-specific application details into the
 * snapshot exactly once, on the first bind of a freshly created session;
 * resume never rewrites an already-recorded application (the snapshot is
 * immutable). Returns null when nothing must change.
 */
export function withRecordedProfileApplication(
  session: import("./session-request-handler-types.js").CoreSession | undefined,
  appliedProfileApplication?: Readonly<Record<string, unknown>>
): import("./session-request-handler-types.js").CoreSession | null {
  if (
    !(session?.appliedProfile && appliedProfileApplication) ||
    session.appliedProfile.appliedProfileApplication
  ) {
    return null;
  }
  return {
    ...session,
    appliedProfile: {
      ...session.appliedProfile,
      appliedProfileApplication,
    },
  };
}

/**
 * Rebuilds the adapter payload strictly from the immutable snapshot (resume
 * never rereads profile files). Native and legacy sessions get no payload.
 */
export function buildSessionProfilePayload(
  snapshot?: AppliedProfileSnapshot
): SessionProfilePayload | undefined {
  if (
    !snapshot ||
    snapshot.kind !== "managed" ||
    snapshot.prompt === undefined ||
    snapshot.contentHash === undefined ||
    snapshot.toolingCategories === undefined
  ) {
    return;
  }
  return {
    contentHash: snapshot.contentHash,
    profileId: snapshot.profileId,
    profileName: snapshot.profileName,
    prompt: snapshot.prompt,
    ...(snapshot.requestTemplate
      ? { requestTemplate: snapshot.requestTemplate }
      : {}),
    ...(snapshot.tools ? { tools: snapshot.tools } : {}),
    toolingCategories: snapshot.toolingCategories,
  };
}
