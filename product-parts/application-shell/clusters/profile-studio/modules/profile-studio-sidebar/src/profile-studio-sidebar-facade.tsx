import { ArrowLeft, FilePlus2, UserRoundCog } from "lucide-react";
import type {
  ProfileStudioProfileRow,
  ProfileStudioTargetProvider,
} from "../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-read-model/src/profile-studio-read-model-facade.js";
import "../../../src/profile-studio.css";

export interface ProfileStudioSidebarFacadeProps {
  readonly createPending: boolean;
  readonly onCreateProfile: () => void | Promise<void>;
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
  createPending,
  onCreateProfile,
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
  const selectedProvider = targets.find(
    (target) => target.id === selectedProviderId
  );
  const canCreate = Boolean(selectedProvider && selectedModelId);

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
            disabled={!selectedProvider}
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
        {createPending ? "Создание…" : "Создать профиль"}
      </button>
      <small className="profile-studio-sidebar__create-note">
        Откроет новую сессию с Profile Creator Agent
      </small>

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
            <button
              aria-current={
                profile.id === selectedProfileId ? "page" : undefined
              }
              className={
                profile.id === selectedProfileId
                  ? "profile-studio-sidebar__profile is-active"
                  : "profile-studio-sidebar__profile"
              }
              key={profile.id}
              onClick={() => onSelectProfile(profile)}
              title={profile.description || profile.purpose}
              type="button"
            >
              <UserRoundCog aria-hidden="true" size={16} />
              <span>{profile.name}</span>
              <ProfileStatusBadge status={profile.status} />
            </button>
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
