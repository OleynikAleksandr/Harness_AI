import {
  Check,
  FileText,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import type {
  ProfileStudioInspectorSnapshot,
  ProfileStudioProfileRow,
} from "../../../../../../core-runtime/clusters/profile-studio/modules/profile-studio-read-model/src/profile-studio-read-model-facade.js";
import "../../../src/profile-studio.css";

type ProfileStudioInspectorTab = "overview" | "prompt" | "tools";

export interface ProfileStudioInspectorFacadeProps {
  readonly approvalPending: boolean;
  readonly onApprove: (contentHash: string) => void | Promise<void>;
  readonly profile: ProfileStudioProfileRow | null;
  readonly snapshot: ProfileStudioInspectorSnapshot | null;
}

const TABS: readonly {
  readonly id: ProfileStudioInspectorTab;
  readonly label: string;
}[] = [
  { id: "overview", label: "Overview" },
  { id: "prompt", label: "Custom System Prompt" },
  { id: "tools", label: "Custom System Tools" },
];

export function ProfileStudioInspectorFacade({
  approvalPending,
  onApprove,
  profile,
  snapshot,
}: ProfileStudioInspectorFacadeProps) {
  const [activeTab, setActiveTab] =
    useState<ProfileStudioInspectorTab>("overview");

  if (!(profile && snapshot)) {
    return (
      <aside
        aria-label="Profile inspector"
        className="profile-studio-inspector"
      >
        <div className="profile-studio-inspector__empty">
          <FileText aria-hidden="true" size={28} />
          <strong>Профиль не выбран</strong>
          <span>
            Выберите совместимый профиль или создайте новую сессию Profile
            Creator Agent.
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Profile inspector" className="profile-studio-inspector">
      <header className="profile-studio-inspector__header">
        <span aria-hidden="true">
          <FileText size={24} />
        </span>
        <div>
          <h1>{profile.name}</h1>
          <p>
            {snapshot.overview.targetLabel}
            <ProfileStatusBadge status={snapshot.overview.approvalStatus} />
          </p>
        </div>
      </header>

      <div
        aria-label="Profile inspector"
        className="profile-studio-inspector__tabs"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "is-active" : undefined}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <OverviewPanel
          approvalPending={approvalPending}
          onApprove={onApprove}
          onSelectTab={setActiveTab}
          snapshot={snapshot}
        />
      ) : null}
      {activeTab === "prompt" ? (
        <PromptPanel snapshot={snapshot.prompt} />
      ) : null}
      {activeTab === "tools" ? <ToolsPanel snapshot={snapshot.tools} /> : null}
    </aside>
  );
}

function OverviewPanel({
  approvalPending,
  onApprove,
  onSelectTab,
  snapshot,
}: {
  readonly approvalPending: boolean;
  readonly onApprove: (contentHash: string) => void | Promise<void>;
  readonly onSelectTab: (tab: ProfileStudioInspectorTab) => void;
  readonly snapshot: ProfileStudioInspectorSnapshot;
}) {
  return (
    <div className="profile-studio-inspector__content">
      <InspectorCard icon={<Target size={18} />} title="Назначение профиля">
        <p>
          {snapshot.overview.purpose || "Назначение ещё не сформулировано."}
        </p>
      </InspectorCard>

      <button
        className="profile-studio-inspector__card profile-studio-inspector__card--button"
        onClick={() => onSelectTab("prompt")}
        type="button"
      >
        <CardIcon>
          <Sparkles size={18} />
        </CardIcon>
        <span>
          <strong>Custom System Prompt</strong>
          <small>Native-основа + Custom-дополнения</small>
        </span>
      </button>

      <button
        className="profile-studio-inspector__card profile-studio-inspector__card--button"
        onClick={() => onSelectTab("tools")}
        type="button"
      >
        <CardIcon>
          <Wrench size={18} />
        </CardIcon>
        <span>
          <strong>Custom System Tools</strong>
          <small>{snapshot.tools.providerCeiling}</small>
        </span>
      </button>

      <InspectorCard icon={<Gauge size={18} />} title="Источник основы">
        <p>{snapshot.overview.donorLabel}</p>
      </InspectorCard>

      <InspectorCard icon={<ShieldCheck size={18} />} title="Lifecycle">
        <dl className="profile-studio-inspector__facts">
          <div>
            <dt>Profile ID</dt>
            <dd>{snapshot.overview.profileId}</dd>
          </div>
          <div>
            <dt>Creator Session</dt>
            <dd>{snapshot.overview.creatorSessionId}</dd>
          </div>
          <div>
            <dt>Content Hash</dt>
            <dd title={snapshot.overview.contentHash}>
              {compactHash(snapshot.overview.contentHash)}
            </dd>
          </div>
        </dl>
      </InspectorCard>

      {snapshot.overview.approvalStatus === "valid" ? (
        <p className="profile-studio-inspector__notice is-valid">
          <Check aria-hidden="true" size={16} />
          Профиль утверждён. Любое принятое изменение вернёт его в Draft.
        </p>
      ) : (
        <>
          <button
            className="profile-studio-inspector__approve"
            disabled={!snapshot.overview.canApprove || approvalPending}
            onClick={() => onApprove(snapshot.overview.contentHash)}
            type="button"
          >
            <ShieldCheck aria-hidden="true" size={17} />
            {approvalPending ? "Подтверждение…" : "Утвердить текущий Draft"}
          </button>
          <p className="profile-studio-inspector__note">
            Valid присваивается только после ручных проверок и явного
            подтверждения текущего content hash.
          </p>
        </>
      )}
    </div>
  );
}

function PromptPanel({
  snapshot,
}: {
  readonly snapshot: ProfileStudioInspectorSnapshot["prompt"];
}) {
  return (
    <div className="profile-studio-inspector__content">
      <header className="profile-studio-inspector__section-heading">
        <h2>Custom System Prompt</h2>
        <p>Две согласуемые части · только для чтения</p>
      </header>
      <PromptPart
        body={snapshot.nativeFoundation}
        empty="Сокращённая Native-основа ещё не создана."
        label="Native · сокращён"
        number="01"
        title="Сокращённая Native-основа"
      />
      <PromptPart
        body={snapshot.customInstructions}
        empty="Custom-дополнения ещё не созданы."
        label="Custom · добавлен"
        number="02"
        title="Custom-дополнения"
      />
    </div>
  );
}

function PromptPart({
  body,
  empty,
  label,
  number,
  title,
}: {
  readonly body: string;
  readonly empty: string;
  readonly label: string;
  readonly number: string;
  readonly title: string;
}) {
  return (
    <details className="profile-studio-inspector__prompt-part" open>
      <summary>
        <span>{number}</span>
        <strong>{title}</strong>
      </summary>
      <div>
        <small>{label}</small>
        <pre className={body.trim() ? undefined : "is-empty"}>
          {body.trim() || empty}
        </pre>
      </div>
    </details>
  );
}

function ToolsPanel({
  snapshot,
}: {
  readonly snapshot: ProfileStudioInspectorSnapshot["tools"];
}) {
  return (
    <div className="profile-studio-inspector__content">
      <header className="profile-studio-inspector__section-heading">
        <h2>Custom System Tools</h2>
        <p>Provider capability ceiling · только для чтения</p>
      </header>
      <div className="profile-studio-inspector__ceiling">
        <Wrench aria-hidden="true" size={17} />
        <span>
          <strong>{toolModeLabel(snapshot.mode)}</strong>
          <small>{snapshot.providerCeiling}</small>
        </span>
      </div>
      {snapshot.blockReason ? (
        <p className="profile-studio-inspector__notice is-blocked">
          {snapshot.blockReason}
        </p>
      ) : null}
      {snapshot.selectedTools.length > 0 ? (
        <ul
          aria-label="Выбранные системные инструменты"
          className="profile-studio-inspector__tools"
        >
          {snapshot.selectedTools.map((tool, index) => (
            <li
              className="profile-studio-inspector__tool"
              key={toolKey(tool, index)}
            >
              <Check aria-hidden="true" size={13} />
              <span>
                <strong>{toolLabel(tool, index)}</strong>
                <small>Native tool descriptor</small>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="profile-studio-inspector__tools-empty">
          {snapshot.mode === "fixed"
            ? "System tools управляются provider и не входят в профиль."
            : "Набор системных инструментов ещё не сформирован."}
        </p>
      )}
      <p className="profile-studio-inspector__note">
        Новые executable tools на первом этапе не создаются. Изменения
        обсуждаются в сессии с Profile Creator Agent.
      </p>
    </div>
  );
}

function InspectorCard({
  children,
  icon,
  title,
}: {
  readonly children: ReactNode;
  readonly icon: ReactNode;
  readonly title: string;
}) {
  return (
    <section className="profile-studio-inspector__card">
      <CardIcon>{icon}</CardIcon>
      <div>
        <h3>{title}</h3>
        {children}
      </div>
    </section>
  );
}

function CardIcon({ children }: { readonly children: ReactNode }) {
  return (
    <span aria-hidden="true" className="profile-studio-inspector__card-icon">
      {children}
    </span>
  );
}

function ProfileStatusBadge({
  status,
}: {
  readonly status: ProfileStudioInspectorSnapshot["overview"]["approvalStatus"];
}) {
  return (
    <span className={`profile-studio-status profile-studio-status--${status}`}>
      {status === "valid" ? "Valid" : "Draft"}
    </span>
  );
}

function compactHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 12)}…${hash.slice(-4)}` : hash;
}

function toolModeLabel(
  mode: ProfileStudioInspectorSnapshot["tools"]["mode"]
): string {
  if (mode === "fixed") {
    return "Provider-fixed tools";
  }
  if (mode === "subset") {
    return "Native tool subset";
  }
  return "Candidate tools · Draft only";
}

function toolLabel(
  tool: Readonly<Record<string, unknown>>,
  index: number
): string {
  for (const key of ["name", "id", "type"]) {
    const value = tool[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return `Tool ${index + 1}`;
}

function toolKey(
  tool: Readonly<Record<string, unknown>>,
  index: number
): string {
  return `${toolLabel(tool, index)}-${index}`;
}
