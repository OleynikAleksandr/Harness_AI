import {
  ArrowLeft,
  FilePlus2,
  LoaderCircle,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ProfileStudioProfileRow,
  ProfileStudioTargetProvider,
} from "../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-read-model/src/profile-studio-read-model-facade.js";
import "../../../src/profile-studio.css";

export interface ProfileStudioSidebarFacadeProps {
  readonly createError: string | null;
  readonly createPending: boolean;
  readonly deletePendingProfileId: string | null;
  readonly onCreateProfile: () => void | Promise<void>;
  readonly onDeleteProfile: (
    profile: ProfileStudioProfileRow
  ) => Promise<boolean>;
  readonly onReturn: () => void;
  readonly onSelectModel: (modelId: string) => void;
  readonly onSelectProfile: (profile: ProfileStudioProfileRow) => void;
  readonly onSelectProvider: (
    providerId: ProfileStudioTargetProvider["id"]
  ) => void;
  readonly profiles: readonly ProfileStudioProfileRow[];
  readonly selectedModelId: string;
  readonly selectedProfileId: string | null;
  readonly selectedProviderId: ProfileStudioTargetProvider["id"] | null;
  readonly targets: readonly ProfileStudioTargetProvider[];
}

export function ProfileStudioSidebarFacade({
  createError,
  createPending,
  deletePendingProfileId,
  onCreateProfile,
  onDeleteProfile,
  onReturn,
  onSelectModel,
  onSelectProfile,
  onSelectProvider,
  profiles,
  selectedModelId,
  selectedProfileId,
  selectedProviderId,
  targets,
}: ProfileStudioSidebarFacadeProps) {
  const [deleteCandidate, setDeleteCandidate] =
    useState<ProfileStudioProfileRow | null>(null);
  const selectedProvider = targets.find(
    (target) => target.id === selectedProviderId
  );
  const canCreate = Boolean(selectedProvider && selectedModelId);

  useEffect(() => {
    if (!deleteCandidate) {
      return;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !deletePendingProfileId) {
        setDeleteCandidate(null);
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [deleteCandidate, deletePendingProfileId]);

  return (
    <aside aria-label="Profile Studio" className="profile-studio-sidebar">
      <header className="profile-studio-sidebar__header">
        <span aria-hidden="true" className="profile-studio-sidebar__mark">
          <UserRoundCog size={20} />
        </span>
        <div>
          <strong>Profile Studio</strong>
          <span>Custom profiles</span>
        </div>
      </header>

      <div className="profile-studio-sidebar__selectors">
        <label>
          <span>Provider</span>
          <select
            disabled={createPending}
            onChange={(event) =>
              onSelectProvider(
                event.currentTarget.value as ProfileStudioTargetProvider["id"]
              )
            }
            value={selectedProviderId ?? ""}
          >
            {targets.length === 0 ? (
              <option value="">Нет доступных providers</option>
            ) : null}
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Model</span>
          <select
            disabled={!selectedProvider || createPending}
            onChange={(event) => onSelectModel(event.currentTarget.value)}
            value={selectedModelId}
          >
            {selectedProvider?.models.length ? null : (
              <option value="">Нет доступных моделей</option>
            )}
            {selectedProvider?.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>

        <p>Provider и Model определяют точный список совместимых профилей.</p>
      </div>

      <button
        className="profile-studio-sidebar__create"
        disabled={!canCreate || createPending}
        onClick={onCreateProfile}
        type="button"
      >
        <FilePlus2 aria-hidden="true" size={17} />
        {createPending ? "Подготовка Capture…" : "Создать профиль"}
      </button>
      {createPending ? (
        <div
          aria-live="polite"
          className="profile-studio-sidebar__preparation"
          role="status"
        >
          <LoaderCircle aria-hidden="true" size={15} />
          <span>
            Core записывает свежий Native Request Capture. Draft и сессия
            появятся только после успешной проверки.
          </span>
        </div>
      ) : (
        <small className="profile-studio-sidebar__create-note">
          Откроет новую сессию с Profile Creator Agent
        </small>
      )}
      {createError ? (
        <p className="profile-studio-sidebar__create-error" role="alert">
          {createError}
        </p>
      ) : null}

      <section className="profile-studio-sidebar__profiles">
        <header>
          <strong>Созданные профили</strong>
          <span>
            {selectedProvider
              ? `${selectedProvider.label} · ${selectedModelId}`
              : "Выберите provider"}
          </span>
        </header>
        <nav aria-label="Совместимые профили">
          {profiles.map((profile) => (
            <div
              className={
                profile.id === selectedProfileId
                  ? "profile-studio-sidebar__profile-row is-active"
                  : "profile-studio-sidebar__profile-row"
              }
              key={profile.id}
              title={profile.description || profile.purpose}
            >
              <button
                aria-current={
                  profile.id === selectedProfileId ? "page" : undefined
                }
                className="profile-studio-sidebar__profile"
                disabled={createPending}
                onClick={() => onSelectProfile(profile)}
                type="button"
              >
                <UserRoundCog aria-hidden="true" size={16} />
                <span>{profile.name}</span>
                <ProfileStatusBadge status={profile.status} />
              </button>
              <button
                aria-label={`Удалить профиль ${profile.name}`}
                className="profile-studio-sidebar__delete"
                disabled={
                  createPending || deletePendingProfileId === profile.id
                }
                onClick={() => setDeleteCandidate(profile)}
                title="Удалить профиль"
                type="button"
              >
                <Trash2 aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
          {profiles.length === 0 ? (
            <p className="profile-studio-sidebar__empty">
              Для выбранной модели профили ещё не созданы.
            </p>
          ) : null}
        </nav>
      </section>

      <button
        className="profile-studio-sidebar__return"
        onClick={onReturn}
        type="button"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Вернуться к рабочим пространствам и сессиям
      </button>
      {deleteCandidate ? (
        <div className="profile-studio-delete-layer">
          <button
            aria-label="Закрыть подтверждение удаления"
            className="profile-studio-delete-backdrop"
            disabled={Boolean(deletePendingProfileId)}
            onClick={() => setDeleteCandidate(null)}
            type="button"
          />
          <section
            aria-labelledby="profile-studio-delete-title"
            aria-modal="true"
            className="profile-studio-delete-dialog"
            role="dialog"
          >
            <h2 id="profile-studio-delete-title">Удалить профиль?</h2>
            <p>
              Профиль «{deleteCandidate.name}» и связанная с ним сессия Profile
              Creator Agent будут удалены.
            </p>
            <div className="profile-studio-delete-actions">
              <button
                disabled={Boolean(deletePendingProfileId)}
                onClick={() => setDeleteCandidate(null)}
                type="button"
              >
                Отмена
              </button>
              <button
                className="is-danger"
                disabled={Boolean(deletePendingProfileId)}
                onClick={async () => {
                  const deleted = await onDeleteProfile(deleteCandidate);
                  if (deleted) {
                    setDeleteCandidate(null);
                  }
                }}
                type="button"
              >
                {deletePendingProfileId ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}

function ProfileStatusBadge({
  status,
}: {
  readonly status: ProfileStudioProfileRow["status"];
}) {
  return (
    <span className={`profile-studio-status profile-studio-status--${status}`}>
      {status === "valid" ? "Valid" : "Draft"}
    </span>
  );
}
