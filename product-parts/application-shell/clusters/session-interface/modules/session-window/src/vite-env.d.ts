/// <reference types="vite/client" />

interface ProviderSystemSettings {
  apiKey?: string;
  baseUrl?: string;
  configPath?: string;
  defaultModel?: string;
  endpointTag?: string;
  model?: string;
}

type HarnessSettings =
  import("../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js").HarnessSettings;
type ProviderModelCatalogs =
  import("../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js").ProviderModelCatalogs;
type LocalizationRuntimePayload =
  import("../../../../../../core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.js").LocalizationRuntimePayload;

// Project workflow (Workflow Kit) read models; Core owns every value.
type WorkflowKitFailure =
  import("../../../../../../core-runtime/clusters/project-workflow/modules/workflow-host/src/workflow-host-facade.js").KitFailure;
type WorkflowKitOutcome<T> =
  import("../../../../../../core-runtime/clusters/project-workflow/modules/workflow-host/src/workflow-host-facade.js").KitOutcome<T>;
type WorkflowInspectResult =
  import("../../../../../../core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-facade.js").InspectResult;
type WorkflowInstallOutcome =
  import("../../../../../../core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-facade.js").InstallOutcome;
type WorkflowDoctorReport =
  import("../../../../../../core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-facade.js").DoctorReport;
type WorkflowKitStatus =
  import("../../../../../../core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.js").KitStatus;
type WorkflowAutopilotDecision =
  import("../../../../../../core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/workflow-autopilot-facade.js").AutopilotDecision;

interface WorkflowPreparedProject {
  inspect: WorkflowInspectResult;
  install: WorkflowInstallOutcome | null;
  ok: true;
  status: WorkflowKitOutcome<WorkflowKitStatus>;
  workspace: import("../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js").HarnessWorkspace;
}

interface WorkflowAutopilotSnapshot {
  available: boolean;
  continues: number;
  enabled: boolean;
  lastDecision: WorkflowAutopilotDecision | null;
  maxContinues: number;
  /** Core-derived pause display state of the session's workspace. */
  pauseState: "paused" | "pausing" | "running";
  running: boolean;
  sessionId: string;
}

/** The Core plan view of the active plan (sidebar); Core owns every field. */
type WorkflowPlanView =
  import("../../../../../../core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-plan-view.js").PlanView;
/** The `workflow-status` result: the Kit outcome plus the Core plan view. */
type WorkflowStatusResult =
  import("../../../../../../core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.js").WorkflowStatusResult;

interface WorkflowStatusEvent {
  path: string;
  planView: WorkflowPlanView | null;
  status: WorkflowKitOutcome<WorkflowKitStatus>;
  type: "workflow:status";
  workspaceId: string;
}

interface WorkflowAutopilotEvent extends WorkflowAutopilotSnapshot {
  type: "workflow:autopilot";
}

type WorkflowAutopilotResult =
  | WorkflowKitFailure
  | { autopilot: WorkflowAutopilotSnapshot; ok: true };

/** The `workflow-pause-set` result: the snapshot with the new pause state. */
type WorkflowPauseResult = WorkflowAutopilotResult;

/** The execution mode card of a workspace; Core owns every field. */
type WorkflowModeChoiceCard =
  import("../../../../../../core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-mode-choice.js").ModeChoiceCard;
type WorkflowModeChoiceOptionId =
  import("../../../../../../core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-mode-choice.js").ModeChoiceOptionId;

interface WorkflowModeChoiceEvent {
  card: WorkflowModeChoiceCard | null;
  sessionId: string;
  type: "workflow:mode-choice";
  workspaceId: string;
}

interface ProviderStatusEvent {
  payload: {
    providerId: string;
    readinessMessage?: string;
    readinessStatus: "checking" | "preparing" | "ready" | "failed";
    workspaceId: string;
  };
  timestamp: string;
  type: "provider:status";
}

interface ProfileStudioUpdatedEvent {
  profileId: string | null;
  reason: "profile-files-changed";
  type: "profile-studio:updated";
}

interface ProviderVersionEntry {
  currentVersion: null | string;
  latestVersion: null | string;
  packageName: string;
}

interface ProviderVersionsSnapshot {
  checkedAt: string;
  claude: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
  codex: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
  // Kimi has no SDK and no npm package: one CLI entry from the native
  // `kimi upgrade` channel.
  kimi: { cli: Omit<ProviderVersionEntry, "packageName"> };
}

interface Window {
  harnessCore?: {
    /** Without an active project Core answers `code: "NO_WORKSPACE"`. */
    createSession(request: unknown): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { code?: "NO_WORKSPACE"; error: string; ok: false }
    >;
    listProfileStudioTargets(): Promise<{
      ok: true;
      targets: readonly import("../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-read-model/src/profile-studio-read-model-facade.js").ProfileStudioTargetProvider[];
    }>;
    listProfileStudioProfiles(request: {
      modelId: string;
      providerId: import("../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js").ProfileStudioProviderId;
    }): Promise<
      | {
          ok: true;
          profiles: readonly import("../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-read-model/src/profile-studio-read-model-facade.js").ProfileStudioProfileRow[];
        }
      | { error: string; ok: false }
    >;
    getProfileStudioProfile(request: {
      profileId: string;
    }): Promise<
      import("../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-read-model/src/profile-studio-read-model-facade.js").ProfileStudioInspectorResult
    >;
    createProfileStudioDraft(request: {
      modelId: string;
      providerId: import("../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js").ProfileStudioProviderId;
    }): Promise<
      | {
          ok: true;
          profile: import("../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js").ProfileStudioProfile;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    approveProfileStudioDraft(request: {
      contentHash: string;
      profileId: string;
    }): Promise<
      import("../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js").ProfileStudioLifecycleResult
    >;
    deleteProfileStudioProfile(request: {
      profileId: string;
    }): Promise<
      import("../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js").ProfileStudioDeleteResult
    >;
    deleteSession(
      sessionId: string
    ): Promise<{ ok: true } | { error: string; ok: false }>;
    ensureGlossaryFile(): Promise<
      { error: string; ok: false } | { filePath: string; ok: true }
    >;
    listSessionProfiles(request?: {
      modelId?: string;
      providerId?: string;
    }): Promise<
      | {
          autoNormalizerByProvider: Readonly<Record<string, boolean>>;
          lastSelectedProfileByProvider: Readonly<Record<string, string>>;
          ok: true;
          profiles: readonly import("../../../../../../core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog-facade.js").SessionProfileCatalogEntry[];
        }
      | { error: string; ok: false }
    >;
    createSessionProfile(request: { name: string; provider: string }): Promise<
      | {
          documents: import("../../../../../../core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store-facade.js").SessionProfileDocumentPaths;
          id: string;
          ok: true;
        }
      | { error: string; ok: false }
    >;
    openSessionProfileFile(request: {
      document?: "passport" | "prompt" | "tooling";
      profileId: string;
    }): Promise<{ error: string; ok: false } | { filePath: string; ok: true }>;
    captureNativeRequest(request: {
      model?: string;
      providerId: string;
      reasoningEffort?: string;
    }): Promise<{
      error: string | null;
      jsonlPath: string | null;
      markdownPath: string | null;
      ok: boolean;
    }>;
    listCapturableModels(): Promise<{
      ok: true;
      providers: {
        id: string;
        models: {
          defaultReasoningEffort: string | null;
          id: string;
          label: string;
          reasoningEfforts: { id: string; label: string }[];
        }[];
      }[];
    }>;
    getSessionEvents(
      sessionId: string
    ): Promise<
      import("../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js").SessionCoreEvent[]
    >;
    getSettings(workspacePath?: string): Promise<HarnessSettings>;
    getLocalizationRuntimePayload(): Promise<LocalizationRuntimePayload>;
    getLocalModels(): Promise<
      | {
          entries: {
            displayName: string;
            key: string;
            loadedContextLength: number | null;
            loadedInstanceId: string | null;
            maxContextLength: number | null;
            supportsTools: boolean | null;
          }[];
          models: string[];
          ok: true;
        }
      | { error: string; ok: false }
    >;
    getProviderSystemSettings(
      providerId: string
    ): Promise<ProviderSystemSettings>;
    getProviderVersions(): Promise<
      | { ok: true; versions: ProviderVersionsSnapshot }
      | { error: string; ok: false }
    >;
    listProviderModelCatalogs(): Promise<ProviderModelCatalogs>;
    listProviders(): Promise<
      import("../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js").ProviderDescriptor[]
    >;
    listSessions(
      workspaceId?: string
    ): Promise<
      import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession[]
    >;
    listWorkspaces(): Promise<{
      /** `null` when no project is active (the list may be empty). */
      activeWorkspaceId: string | null;
      workspaces: import("../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js").HarnessWorkspace[];
    }>;
    rebuildLocalization(): Promise<{ ok: true } | { error: string; ok: false }>;
    regenerateSessionTitle(request: { sessionId: string }): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    renameSession(request: { sessionId: string; title: string }): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    respondProviderInteraction(request: {
      decision: import("../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js").ProviderInteractionDecision;
      sessionId: string;
    }): Promise<{ ok: true } | { error: string; ok: false }>;
    onEvent(
      listener: (
        event:
          | import("../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js").SessionCoreEvent
          | ProviderStatusEvent
          | WorkflowAutopilotEvent
          | WorkflowModeChoiceEvent
          | WorkflowStatusEvent
      ) => void
    ): () => void;
    onProfileStudioUpdated(
      listener: (event: ProfileStudioUpdatedEvent) => void
    ): () => void;
    saveProviderSystemSettings(request: {
      providerId: string;
      settings: ProviderSystemSettings;
    }): Promise<
      | { ok: true; settings: ProviderSystemSettings }
      | { error: string; ok: false }
    >;
    /** Removes a project from the app (not from disk). */
    removeWorkspace(workspaceId: string): Promise<
      | {
          activeWorkspaceId: string | null;
          ok: true;
          workspaces: import("../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js").HarnessWorkspace[];
        }
      | {
          code: "UNKNOWN_WORKSPACE";
          error: string;
          ok: false;
        }
    >;
    resetWorkspaceSettings(): Promise<
      { ok: true; settings: HarnessSettings } | { error: string; ok: false }
    >;
    rollbackSessionTurns(request: {
      numTurns?: number;
      preserveFirstUserTurns?: number;
      sessionId: string;
    }): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    pickProjectFolder(): Promise<{ canceled: boolean; path: string | null }>;
    pickProjectParent(): Promise<{ canceled: boolean; path: string | null }>;
    inspectProjectFolder(request: {
      path: string;
    }): Promise<WorkflowKitOutcome<WorkflowInspectResult>>;
    prepareProject(request: {
      install?: boolean;
      mode: "new" | "open";
      name?: string;
      path: string;
    }): Promise<WorkflowKitFailure | WorkflowPreparedProject>;
    /**
     * The one-time global git identity: the Kit validates and writes it.
     * After a success the client repeats the `prepareProject` request that
     * failed with GIT_IDENTITY_REQUIRED.
     */
    setGitIdentity(request: {
      email: string;
      name: string;
    }): Promise<
      WorkflowKitOutcome<
        import("../../../../../../core-runtime/clusters/project-workflow/modules/workflow-host/src/workflow-host-facade.js").GitIdentitySetResult
      >
    >;
    getWorkflowStatus(request: {
      workspaceId?: string;
    }): Promise<WorkflowKitFailure | WorkflowStatusResult>;
    runProjectDoctor(request: {
      fix?: boolean;
      workspaceId?: string;
    }): Promise<WorkflowKitOutcome<WorkflowDoctorReport>>;
    getWorkflowAutopilot(request: {
      sessionId: string;
    }): Promise<WorkflowAutopilotResult>;
    setWorkflowAutopilot(request: {
      enabled: boolean;
      sessionId: string;
    }): Promise<WorkflowAutopilotResult>;
    /** Sets or lifts the Workflow Kit pause of the session's workspace. */
    setWorkflowPause(request: {
      paused: boolean;
      sessionId: string;
    }): Promise<WorkflowPauseResult>;
    /** The execution mode card of a workspace, or null. */
    getWorkflowModeChoice(request: {
      workspaceId: string;
    }): Promise<
      WorkflowKitFailure | { card: WorkflowModeChoiceCard | null; ok: true }
    >;
    /** The user's click on the card; Core records it and messages the agent. */
    chooseWorkflowMode(request: {
      generation: number;
      option: WorkflowModeChoiceOptionId;
      sessionId: string;
      workspaceId: string;
    }): Promise<
      | WorkflowKitFailure
      | {
          card: WorkflowModeChoiceCard;
          choice: import("../../../../../../core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.js").ScopeChoiceResult;
          ok: true;
        }
    >;
    pickWorkspaceFolder(): Promise<
      | {
          ok: true;
          workspace: import("../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js").HarnessWorkspace;
        }
      | { canceled?: boolean; error?: string; ok: false }
    >;
    restartCore(): Promise<
      | {
          ok: true;
          providers: import("../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js").ProviderDescriptor[];
          settings: HarnessSettings;
        }
      | { error: string; ok: false }
    >;
    saveSettings(request: {
      settings: HarnessSettings;
    }): Promise<
      { ok: true; settings: HarnessSettings } | { error: string; ok: false }
    >;
    selectWorkspace(workspaceId: string): Promise<
      | {
          ok: true;
          workspace: import("../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js").HarnessWorkspace;
        }
      | { error: string; ok: false }
    >;
    sendMessage(request: unknown): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    setLocalModelContext(request: {
      contextLength: number;
      model: string;
    }): Promise<
      | {
          entries: {
            displayName: string;
            key: string;
            loadedContextLength: number | null;
            loadedInstanceId: string | null;
            maxContextLength: number | null;
            supportsTools: boolean | null;
          }[];
          ok: true;
        }
      | {
          entries?: {
            displayName: string;
            key: string;
            loadedContextLength: number | null;
            loadedInstanceId: string | null;
            maxContextLength: number | null;
            supportsTools: boolean | null;
          }[];
          error: string;
          ok: false;
        }
    >;
    stopTurn(sessionId: string): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    translateDynamicText(request: {
      category?: "generic" | "reasoning";
      text: string;
    }): Promise<
      | { ok: true; status: string; text: string }
      | { error: string; ok: false; text: string }
    >;
    updateProviderVersion(request: {
      provider: "claude" | "codex" | "kimi";
      target: "cli" | "sdk";
    }): Promise<
      | { ok: true; versions: ProviderVersionsSnapshot }
      | { error: string; ok: false }
    >;
  };
  harnessFilePaths?: {
    getPathForFile(file: File): string;
  };
  harnessRuntime?: {
    providerDispatchMode: "core-session-dispatch";
  };
  harnessShell?: {
    detachSession(request: {
      sessionId: string;
      workspaceId: string;
    }): Promise<{ ok: true } | { error: string; ok: false }>;
    restartApp(): Promise<{ ok: true } | { error: string; ok: false }>;
  };
}
