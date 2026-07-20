import type { CoreSubagentCall } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import type {
  SessionMessage,
  SessionTelemetry,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import type { TurnTiming } from "../../../../../../core-runtime/clusters/session-runtime/modules/turn-timing/src/turn-timing-facade.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import {
  DialogPanel,
  ReferenceInputPanel,
  ReferenceStatusPanel,
  SessionIdPanel,
  SubagentSessionHeader,
} from "../../session-window/src/reference-session-panels.js";

export interface SessionSurfaceFacadeProps {
  readonly messages: SessionMessage[];
  readonly onOpenSession: (sessionId: string) => void | Promise<void>;
  readonly onRollbackTurns: (preserveFirstUserTurns: number) => void;
  readonly onStop: () => void | Promise<void>;
  readonly onSubmit: (text: string) => void | Promise<void>;
  readonly rollbackPending: boolean;
  readonly running: boolean;
  readonly session?: CoreSession;
  readonly sessions: readonly CoreSession[];
  readonly settings: HarnessSettings | null;
  readonly subagentCalls: readonly CoreSubagentCall[];
  readonly telemetry: SessionTelemetry;
  readonly timing: TurnTiming;
  readonly workspaceRoot?: string;
}

export function SessionSurfaceFacade(props: SessionSurfaceFacadeProps) {
  const { session } = props;
  if (!session) {
    return (
      <main
        aria-label="Session workspace"
        className="session-empty-workspace"
      />
    );
  }
  const parentSession = session.parentSessionId
    ? props.sessions.find(
        (candidate) => candidate.id === session.parentSessionId
      )
    : undefined;
  const isSubagentSession = session.sessionKind === "subagent";
  return (
    <main
      className={
        isSubagentSession
          ? "session-reference-shell session-reference-shell--subagent"
          : "session-reference-shell"
      }
    >
      <SessionIdPanel session={session} telemetry={props.telemetry} />
      {isSubagentSession ? (
        <SubagentSessionHeader
          onOpenParent={props.onOpenSession}
          parentSession={parentSession}
          session={session}
        />
      ) : null}
      <DialogPanel
        messages={props.messages}
        providerId={session.providerId}
        providerName={session.providerName}
        sessions={props.sessions}
        subagentCalls={props.subagentCalls}
        workspaceRoot={props.workspaceRoot}
      />
      {isSubagentSession ? null : (
        <ReferenceInputPanel
          disabled={props.running}
          onStop={props.onStop}
          onSubmit={props.onSubmit}
          timing={props.timing}
        />
      )}
      <ReferenceStatusPanel
        onRollbackTurns={props.onRollbackTurns}
        rollbackPending={props.rollbackPending}
        session={session}
        settings={props.settings}
        telemetry={props.telemetry}
      />
    </main>
  );
}
