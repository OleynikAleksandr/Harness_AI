import type { ProviderDescriptorFacade } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import type { ProfileCatalogFacade } from "../../../../session-profiles/modules/profile-catalog/src/profile-catalog-facade.js";
import type { ProfileMaterializerFacade } from "../../../../session-profiles/modules/profile-materializer/src/profile-materializer-facade.js";
import type {
  ProfileStoreFacade,
  SessionProfile,
  SessionProfileStudioPassport,
} from "../../../../session-profiles/modules/profile-store/src/profile-store-facade.js";
import type { ToolSourceProvider } from "../../../../universal-client/modules/tool-registry/src/tool-registry-facade.js";
import type {
  ProfileStudioLifecycleFacade,
  ProfileStudioProfile,
  ProfileStudioProviderId,
} from "../../profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js";

export interface ProfileStudioTargetModel {
  readonly id: string;
  readonly label: string;
}

export interface ProfileStudioTargetProvider {
  readonly id: ProfileStudioProviderId;
  readonly label: string;
  readonly models: readonly ProfileStudioTargetModel[];
}

export interface ProfileStudioProfileRow {
  readonly creatorSessionId: string;
  readonly description: string;
  readonly id: string;
  readonly name: string;
  readonly purpose: string;
  readonly status: "draft" | "valid";
}

export interface ProfileStudioInspectorSnapshot {
  readonly overview: {
    readonly approvalStatus: "draft" | "valid";
    readonly canApprove: boolean;
    readonly contentHash: string;
    readonly creatorSessionId: string;
    readonly donorLabel: string;
    readonly profileId: string;
    readonly purpose: string;
    readonly targetLabel: string;
  };
  readonly prompt: {
    readonly compiledSystemPrompt: string;
    readonly customInstructions: string;
    readonly nativeFoundation: string;
  };
  readonly tools: {
    readonly blockReason: string | null;
    readonly editable: boolean;
    readonly mode: "candidate-draft-only" | "fixed" | "subset";
    readonly providerCeiling: string;
    readonly selectedTools: readonly Readonly<Record<string, unknown>>[];
  };
}

export type ProfileStudioInspectorResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly snapshot: ProfileStudioInspectorSnapshot };

interface ProfileStudioReadModelFacadeOptions {
  readonly profileCatalog: Pick<
    ProfileCatalogFacade,
    "listStudioProfilesForTarget"
  >;
  readonly profileLifecycle: Pick<ProfileStudioLifecycleFacade, "getProfile">;
  readonly profileMaterializer: Pick<ProfileMaterializerFacade, "materialize">;
  readonly profileStore: Pick<ProfileStoreFacade, "loadProfile">;
  readonly providerDescriptor: Pick<
    ProviderDescriptorFacade,
    "getCapturableModels" | "getClientModels"
  >;
  readonly universalToolSource: Pick<ToolSourceProvider, "list">;
}

const KIMI_CAPTURED_NATIVE_TOOL_COUNT = 25;
const READ_MODEL_DATE = new Date(0);

export class ProfileStudioReadModelFacade {
  private readonly options: ProfileStudioReadModelFacadeOptions;

  constructor(options: ProfileStudioReadModelFacadeOptions) {
    this.options = options;
  }

  listTargets(): readonly ProfileStudioTargetProvider[] {
    return [
      {
        id: "claude",
        label: "Claude",
        models: toTargetModels(
          this.options.providerDescriptor.getCapturableModels("claude")
        ),
      },
      {
        id: "codex",
        label: "Codex",
        models: toTargetModels(
          this.options.providerDescriptor.getCapturableModels("codex")
        ),
      },
      {
        id: "kimi-client",
        label: "Kimi",
        models: toTargetModels(
          this.options.providerDescriptor.getClientModels("kimi-client")
        ),
      },
    ];
  }

  async listProfilesForTarget(request: {
    readonly modelId: string;
    readonly providerId: ProfileStudioProviderId;
  }): Promise<readonly ProfileStudioProfileRow[]> {
    const profiles =
      await this.options.profileCatalog.listStudioProfilesForTarget(request);
    return profiles.map((profile) => ({
      creatorSessionId: profile.creatorSessionId,
      description: profile.description,
      id: profile.id,
      name: profile.name,
      purpose: profile.purpose,
      status: profile.status,
    }));
  }

  async getInspector(profileId: string): Promise<ProfileStudioInspectorResult> {
    const [lifecycle, stored] = await Promise.all([
      this.options.profileLifecycle.getProfile(profileId),
      this.options.profileStore.loadProfile(profileId),
    ]);
    if (!(lifecycle.ok && stored.ok && isStudioProfile(stored.profile))) {
      return {
        error: `Studio profile "${profileId}" was not found.`,
        ok: false,
      };
    }
    const compiled = this.options.profileMaterializer.materialize(
      stored.profile,
      { sessionStartDate: READ_MODEL_DATE }
    );
    return {
      ok: true,
      snapshot: {
        overview: buildOverview(
          lifecycle.profile,
          Boolean(
            stored.profile.promptBody.trim() &&
              stored.profile.customInstructionsBody.trim()
          )
        ),
        prompt: {
          compiledSystemPrompt: compiled.prompt,
          customInstructions: stored.profile.customInstructionsBody,
          nativeFoundation: stored.profile.promptBody,
        },
        tools: this.buildTools(stored.profile),
      },
    };
  }

  private buildTools(
    profile: SessionProfile & {
      readonly passport: SessionProfileStudioPassport;
    }
  ): ProfileStudioInspectorSnapshot["tools"] {
    const selectedTools = profile.nativeRequest?.tools ?? [];
    switch (profile.passport.provider) {
      case "claude":
        return {
          blockReason: null,
          editable: true,
          mode: "subset",
          providerCeiling: "Claude native tool subset",
          selectedTools,
        };
      case "codex":
        return {
          blockReason: null,
          editable: false,
          mode: "fixed",
          providerCeiling: "Codex app-server tools are fixed",
          selectedTools: [],
        };
      default: {
        const executorCount = this.options.universalToolSource.list().length;
        return {
          blockReason: `Kimi remains Draft: universal client has ${executorCount}/${KIMI_CAPTURED_NATIVE_TOOL_COUNT} captured native tool executors.`,
          editable: true,
          mode: "candidate-draft-only",
          providerCeiling: `${executorCount}/${KIMI_CAPTURED_NATIVE_TOOL_COUNT} executors`,
          selectedTools,
        };
      }
    }
  }
}

function buildOverview(
  profile: ProfileStudioProfile,
  promptReady: boolean
): ProfileStudioInspectorSnapshot["overview"] {
  return {
    approvalStatus: profile.lifecycleStatus,
    canApprove:
      profile.target.providerId !== "kimi-client" &&
      profile.lifecycleStatus === "draft" &&
      Boolean(profile.nativeCaptureDonor) &&
      promptReady,
    contentHash: profile.contentHash,
    creatorSessionId: profile.creatorSessionId,
    donorLabel: profile.nativeCaptureDonor
      ? `Основан на Native Capture ${profile.nativeCaptureDonor.captureId}`
      : "Native Capture donor не выбран",
    profileId: profile.profileId,
    purpose: profile.purpose,
    targetLabel: `${profile.target.providerId} / ${profile.target.modelId}`,
  };
}

function toTargetModels(
  models: readonly { readonly id: string; readonly label: string }[]
): readonly ProfileStudioTargetModel[] {
  return models.map((model) => ({ id: model.id, label: model.label }));
}

function isStudioProfile(profile: SessionProfile): profile is SessionProfile & {
  readonly passport: SessionProfileStudioPassport;
} {
  return (
    "schemaVersion" in profile.passport && profile.passport.schemaVersion === 2
  );
}
