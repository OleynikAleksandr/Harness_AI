import { randomUUID } from "node:crypto";
import { providerDescriptorFacade } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import {
  ProfileStudioLifecycleFacade,
  type ProfileStudioProviderId,
} from "../../../../profile-studio/modules/profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js";
import { ProfileStudioReadModelFacade } from "../../../../profile-studio/modules/profile-studio-read-model/src/profile-studio-read-model-facade.js";
import { ProfileAuthoringFacade } from "../../../../session-profiles/modules/profile-authoring/src/profile-authoring-facade.js";
import { ProfileCatalogFacade } from "../../../../session-profiles/modules/profile-catalog/src/profile-catalog-facade.js";
import { ProfileMaterializerFacade } from "../../../../session-profiles/modules/profile-materializer/src/profile-materializer-facade.js";
import {
  isSessionProfileStudioPassport,
  ProfileStoreFacade,
} from "../../../../session-profiles/modules/profile-store/src/profile-store-facade.js";
import { sessionRequestHandlerFacade } from "../../../../session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import { createBuiltinToolSource } from "../../../../universal-client/modules/builtin-tools/src/builtin-tools-facade.js";

const profileStore = new ProfileStoreFacade();
const profileMaterializer = new ProfileMaterializerFacade();
const profileLifecycle = new ProfileStudioLifecycleFacade({
  profileAuthoring: new ProfileAuthoringFacade({ profileStore }),
  profileMaterializer,
  profileStore,
});
const profileReadModel = new ProfileStudioReadModelFacade({
  profileCatalog: new ProfileCatalogFacade({ profileStore }),
  profileLifecycle,
  profileMaterializer,
  profileStore,
  providerDescriptor: providerDescriptorFacade,
  universalToolSource: createBuiltinToolSource(),
});

export class CoreProfileStudioRpcFacade {
  listTargets(): { readonly ok: true; readonly targets: unknown } {
    return { ok: true, targets: profileReadModel.listTargets() };
  }

  async listProfiles(payload: unknown): Promise<unknown> {
    const target = readTarget(payload);
    if (!target.ok) {
      return target;
    }
    return {
      ok: true,
      profiles: await profileReadModel.listProfilesForTarget(target.target),
    };
  }

  getProfile(payload: unknown): Promise<unknown> {
    const profileId = readProfileId(payload);
    return profileId
      ? profileReadModel.getInspector(profileId)
      : Promise.resolve({
          error: "Profile Studio profile id is required.",
          ok: false,
        });
  }

  async createDraft(payload: unknown): Promise<unknown> {
    const target = readTarget(payload);
    if (!target.ok) {
      return target;
    }
    const sessionId = `session-claude-${randomUUID()}`;
    const draft = await profileLifecycle.createDraft({
      creatorSessionId: sessionId,
      modelId: target.target.modelId,
      providerId: target.target.providerId,
    });
    if (!draft.ok) {
      return draft;
    }
    const stored = await profileStore.loadProfile(draft.profile.profileId);
    if (
      !(stored.ok && isSessionProfileStudioPassport(stored.profile.passport))
    ) {
      return { error: "Created Studio Draft could not be loaded.", ok: false };
    }
    const passport = stored.profile.passport;
    const session =
      await sessionRequestHandlerFacade.createProfileCreatorSession({
        context: {
          currentDraft: {
            customInstructions: stored.profile.customInstructionsBody,
            description: passport.description,
            donorReference: passport.nativeCaptureDonor
              ? { artifactPath: passport.nativeCaptureDonor.artifactPath }
              : null,
            name: passport.name,
            purpose: passport.purpose,
            systemPrompt: stored.profile.promptBody,
            toolSelection: initialToolSelection(
              target.target.providerId,
              stored.profile.nativeRequest?.tools ?? []
            ),
          },
          donorContent: null,
          profileId: draft.profile.profileId,
          target: target.target,
        },
        sessionId,
        title: `Profile Creator · ${target.target.providerId} / ${target.target.modelId}`,
      });
    if (!session.ok) {
      return session;
    }
    return { ok: true, profile: draft.profile, session: session.session };
  }

  async approveDraft(payload: unknown): Promise<unknown> {
    const record = readRecord(payload);
    const profileId = readString(record?.profileId);
    const contentHash = readString(record?.contentHash);
    if (!(profileId && contentHash)) {
      return {
        error: "Profile Studio profile id and content hash are required.",
        ok: false,
      };
    }
    const current = await profileLifecycle.getProfile(profileId);
    if (!current.ok) {
      return current;
    }
    if (current.profile.target.providerId === "kimi-client") {
      return {
        error:
          "Kimi validation is blocked until universal tools reach native parity.",
        ok: false,
      };
    }
    return profileLifecycle.approveDraft({ contentHash, profileId });
  }
}

function initialToolSelection(
  providerId: ProfileStudioProviderId,
  tools: readonly Readonly<Record<string, unknown>>[]
) {
  if (providerId === "codex") {
    return { mode: "codex-fixed" as const, tools: null };
  }
  return providerId === "claude"
    ? { mode: "claude-subset" as const, tools }
    : { mode: "kimi-candidate" as const, tools };
}

function readTarget(value: unknown):
  | { readonly error: string; readonly ok: false }
  | {
      readonly ok: true;
      readonly target: {
        readonly modelId: string;
        readonly providerId: ProfileStudioProviderId;
      };
    } {
  const record = readRecord(value);
  const providerId = readString(record?.providerId);
  const modelId = readString(record?.modelId);
  if (!(modelId && isProfileStudioProviderId(providerId))) {
    return {
      error: "A supported Profile Studio provider and model are required.",
      ok: false,
    };
  }
  return { ok: true, target: { modelId, providerId } };
}

function readProfileId(value: unknown): string {
  return readString(readRecord(value)?.profileId);
}

function isProfileStudioProviderId(
  value: string
): value is ProfileStudioProviderId {
  return value === "claude" || value === "codex" || value === "kimi-client";
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const coreProfileStudioRpcFacade = new CoreProfileStudioRpcFacade();
