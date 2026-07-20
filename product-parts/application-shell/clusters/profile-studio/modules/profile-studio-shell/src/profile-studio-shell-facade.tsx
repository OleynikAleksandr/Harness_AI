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
  const [approvalPending, setApprovalPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const selectedProfileIdRef = useRef<string | null>(null);
  const selectProfile = useCallback(
    (profile: ProfileStudioProfileRow | null) => {
      const profileId = profile?.id ?? null;
      selectedProfileIdRef.current = profileId;
      setSelectedProfileId(profileId);
      setInspector(null);
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
      .then((result) => {
        if (cancelled) {
          return;
        }
        setTargets(result.targets);
        const initial = firstTarget(result.targets);
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
    setError(null);
  }

  function selectModel(modelId: string) {
    setSelectedModelId(modelId);
    setProfiles([]);
    selectProfile(null);
    setError(null);
  }

  async function createProfile() {
    if (!(selectedProviderId && selectedModelId)) {
      return;
    }
    setCreatePending(true);
    setError(null);
    try {
      const result = await window.harnessCore?.createProfileStudioDraft({
        modelId: selectedModelId,
        providerId: selectedProviderId,
      });
      if (!result?.ok) {
        setError(result?.error ?? "Core runtime bridge is unavailable.");
        return;
      }
      selectedProfileIdRef.current = result.profile.profileId;
      setSelectedProfileId(result.profile.profileId);
      onAddCreatorSession(result.session);
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(errorMessage(cause));
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

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const selectedCreatorSession =
    sessionSurface.session?.id === selectedProfile?.creatorSessionId
      ? sessionSurface.session
      : undefined;

  return (
    <section aria-label="Profile Studio" className="profile-studio-shell">
      <ProfileStudioSidebarFacade
        createPending={createPending}
        onCreateProfile={createProfile}
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
      <SessionSurfaceFacade
        {...sessionSurface}
        session={selectedCreatorSession}
        workspaceRoot={selectedCreatorSession?.workspacePath}
      />
      <ProfileStudioInspectorFacade
        approvalPending={approvalPending}
        onApprove={approveDraft}
        profile={selectedProfile}
        snapshot={inspector}
      />
      {error ? (
        <div className="profile-studio-shell__error" role="alert">
          {error}
        </div>
      ) : null}
    </section>
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

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
