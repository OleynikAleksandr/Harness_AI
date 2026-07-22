import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ProfileStudioInspectorSnapshot,
  ProfileStudioProfileRow,
  ProfileStudioTargetProvider,
} from "../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-read-model/src/profile-studio-read-model-facade.js";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import {
  SessionSurfaceFacade,
  type SessionSurfaceFacadeProps,
} from "../../../../session-interface/modules/session-surface/src/session-surface-facade.js";
import { ProfileStudioInspectorFacade } from "../../profile-studio-inspector/src/profile-studio-inspector-facade.js";
import { ProfileStudioSidebarFacade } from "../../profile-studio-sidebar/src/profile-studio-sidebar-facade.js";
import "../../../src/profile-studio.css";
import { ProfileStudioPaneLayout } from "./profile-studio-pane-layout.js";

export interface ProfileStudioShellFacadeProps {
  readonly onAddCreatorSession: (session: CoreSession) => void;
  readonly onReturn: () => void | Promise<void>;
  readonly onSelectCreatorSession: (sessionId: string) => void | Promise<void>;
  readonly sessionSurface: SessionSurfaceFacadeProps;
}

export function ProfileStudioShellFacade({
  onAddCreatorSession,
  onReturn,
  onSelectCreatorSession,
  sessionSurface,
}: ProfileStudioShellFacadeProps) {
  const [targets, setTargets] = useState<
    readonly ProfileStudioTargetProvider[]
  >([]);
  const [selectedProviderId, setSelectedProviderId] = useState<
    ProfileStudioTargetProvider["id"] | null
  >(null);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [profiles, setProfiles] = useState<readonly ProfileStudioProfileRow[]>(
    []
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [inspector, setInspector] =
    useState<ProfileStudioInspectorSnapshot | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletePendingProfileId, setDeletePendingProfileId] = useState<
    string | null
  >(null);
  const [approvalPending, setApprovalPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const selectedProfileIdRef = useRef<string | null>(null);
  const initialCreatorSessionRef = useRef(sessionSurface.session);
  const selectProfile = useCallback(
    (profile: ProfileStudioProfileRow | null) => {
      const profileId = profile?.id ?? null;
      const selectionChanged = selectedProfileIdRef.current !== profileId;
      selectedProfileIdRef.current = profileId;
      setSelectedProfileId(profileId);
      if (selectionChanged) {
        setInspector(null);
      }
      if (profile) {
        onSelectCreatorSession(profile.creatorSessionId);
      }
    },
    [onSelectCreatorSession]
  );

  useEffect(() => {
    let cancelled = false;
    window.harnessCore
      ?.listProfileStudioTargets()
      .then(async (result) => {
        if (cancelled) {
          return;
        }
        setTargets(result.targets);
        const initial = await resolveInitialSelection(
          result.targets,
          initialCreatorSessionRef.current
        );
        if (cancelled) {
          return;
        }
        selectedProfileIdRef.current = initial?.profileId ?? null;
        setSelectedProviderId(initial?.providerId ?? null);
        setSelectedModelId(initial?.modelId ?? "");
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(errorMessage(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (refreshKey > 0) {
      setError(null);
    }
    if (!(selectedProviderId && selectedModelId)) {
      setProfiles([]);
      selectProfile(null);
      return;
    }
    let cancelled = false;
    window.harnessCore
      ?.listProfileStudioProfiles({
        modelId: selectedModelId,
        providerId: selectedProviderId,
      })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (!result?.ok) {
          setError(result?.error ?? "Core runtime bridge is unavailable.");
          setProfiles([]);
          selectProfile(null);
          return;
        }
        setProfiles(result.profiles);
        const nextProfile =
          result.profiles.find(
            (profile) => profile.id === selectedProfileIdRef.current
          ) ??
          result.profiles[0] ??
          null;
        selectProfile(nextProfile);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(errorMessage(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedModelId, selectedProviderId, refreshKey, selectProfile]);

  useEffect(() => {
    if (refreshKey > 0) {
      setInspector(null);
    }
    if (!selectedProfileId) {
      setInspector(null);
      return;
    }
    let cancelled = false;
    window.harnessCore
      ?.getProfileStudioProfile({ profileId: selectedProfileId })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (!result?.ok) {
          setError(result?.error ?? "Core runtime bridge is unavailable.");
          setInspector(null);
          return;
        }
        setInspector(result.snapshot);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(errorMessage(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProfileId, refreshKey]);

  useEffect(
    () =>
      window.harnessCore?.onProfileStudioUpdated(() => {
        setRefreshKey((current) => current + 1);
      }),
    []
  );

  function selectProvider(providerId: ProfileStudioTargetProvider["id"]) {
    const provider = targets.find((target) => target.id === providerId);
    setSelectedProviderId(providerId);
    setSelectedModelId(provider?.models[0]?.id ?? "");
    setProfiles([]);
    selectProfile(null);
    setCreateError(null);
    setError(null);
  }

  function selectModel(modelId: string) {
    setSelectedModelId(modelId);
    setProfiles([]);
    selectProfile(null);
    setCreateError(null);
    setError(null);
  }

  async function createProfile() {
    if (!(selectedProviderId && selectedModelId)) {
      return;
    }
    setCreatePending(true);
    setCreateError(null);
    setError(null);
    try {
      const result = await window.harnessCore?.createProfileStudioDraft({
        modelId: selectedModelId,
        providerId: selectedProviderId,
      });
      if (!result?.ok) {
        setCreateError(result?.error ?? "Core runtime bridge is unavailable.");
        return;
      }
      const createdProfile: ProfileStudioProfileRow = {
        creatorSessionId: result.profile.creatorSessionId,
        description: result.profile.description,
        id: result.profile.profileId,
        name: result.profile.name,
        purpose: result.profile.purpose,
        status: result.profile.lifecycleStatus,
      };
      setProfiles((current) => [
        createdProfile,
        ...current.filter((profile) => profile.id !== createdProfile.id),
      ]);
      onAddCreatorSession(result.session);
      selectProfile(createdProfile);
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setCreateError(errorMessage(cause));
    } finally {
      setCreatePending(false);
    }
  }

  async function approveDraft(contentHash: string) {
    if (!selectedProfileId) {
      return;
    }
    setApprovalPending(true);
    setError(null);
    try {
      const result = await window.harnessCore?.approveProfileStudioDraft({
        contentHash,
        profileId: selectedProfileId,
      });
      if (!result?.ok) {
        setError(result?.error ?? "Core runtime bridge is unavailable.");
        return;
      }
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setApprovalPending(false);
    }
  }

  async function deleteProfile(
    profile: ProfileStudioProfileRow
  ): Promise<boolean> {
    setDeletePendingProfileId(profile.id);
    setError(null);
    try {
      const result = await window.harnessCore?.deleteProfileStudioProfile({
        profileId: profile.id,
      });
      if (!result?.ok) {
        setError(result?.error ?? "Core runtime bridge is unavailable.");
        return false;
      }
      const remainingProfiles = profiles.filter(
        (candidate) => candidate.id !== profile.id
      );
      setProfiles(remainingProfiles);
      if (selectedProfileIdRef.current === profile.id) {
        selectProfile(remainingProfiles[0] ?? null);
      }
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setDeletePendingProfileId(null);
    }
  }

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const selectedCreatorSession =
    sessionSurface.session?.id === selectedProfile?.creatorSessionId
      ? sessionSurface.session
      : undefined;

  return (
    <ProfileStudioPaneLayout
      center={
        <SessionSurfaceFacade
          {...sessionSurface}
          session={selectedCreatorSession}
          workspaceRoot={selectedCreatorSession?.workspacePath}
        />
      }
      left={
        <ProfileStudioSidebarFacade
          createError={createError}
          createPending={createPending}
          deletePendingProfileId={deletePendingProfileId}
          onCreateProfile={createProfile}
          onDeleteProfile={deleteProfile}
          onReturn={onReturn}
          onSelectModel={selectModel}
          onSelectProfile={selectProfile}
          onSelectProvider={selectProvider}
          profiles={profiles}
          selectedModelId={selectedModelId}
          selectedProfileId={selectedProfileId}
          selectedProviderId={selectedProviderId}
          targets={targets}
        />
      }
      overlay={
        error ? (
          <div className="profile-studio-shell__error" role="alert">
            {error}
          </div>
        ) : null
      }
      right={
        <ProfileStudioInspectorFacade
          approvalPending={approvalPending}
          onApprove={approveDraft}
          profile={selectedProfile}
          snapshot={inspector}
        />
      }
    />
  );
}

function firstTarget(targets: readonly ProfileStudioTargetProvider[]): {
  readonly modelId: string;
  readonly providerId: ProfileStudioTargetProvider["id"];
} | null {
  for (const provider of targets) {
    const model = provider.models[0];
    if (model) {
      return { modelId: model.id, providerId: provider.id };
    }
  }
  return null;
}

async function resolveInitialSelection(
  targets: readonly ProfileStudioTargetProvider[],
  session: CoreSession | undefined
): Promise<{
  readonly modelId: string;
  readonly profileId: string | null;
  readonly providerId: ProfileStudioTargetProvider["id"];
} | null> {
  if (session?.sessionPurpose?.type === "profile-creator") {
    const profile = await window.harnessCore?.getProfileStudioProfile({
      profileId: session.sessionPurpose.profileId,
    });
    const storedTarget = profile?.ok ? profile.snapshot.overview.target : null;
    const provider = targets.find(
      (target) => target.id === storedTarget?.providerId
    );
    const model = provider?.models.find(
      (item) => item.id === storedTarget?.modelId
    );
    if (provider && model) {
      return {
        modelId: model.id,
        profileId: session.sessionPurpose.profileId,
        providerId: provider.id,
      };
    }
  }
  const target = firstTarget(targets);
  return target ? { ...target, profileId: null } : null;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
