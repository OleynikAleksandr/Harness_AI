import { ProfileStudioAgentFacade } from "../../../../profile-studio/modules/profile-studio-agent/src/profile-studio-agent-facade.js";
import { ProfileStudioAuthoringFacade } from "../../../../profile-studio/modules/profile-studio-authoring/src/profile-studio-authoring-facade.js";
import { ProfileStudioLifecycleFacade } from "../../../../profile-studio/modules/profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js";
import { ProfileAuthoringFacade } from "../../../../session-profiles/modules/profile-authoring/src/profile-authoring-facade.js";
import { ProfileMaterializerFacade } from "../../../../session-profiles/modules/profile-materializer/src/profile-materializer-facade.js";
import { ProfileStoreFacade } from "../../../../session-profiles/modules/profile-store/src/profile-store-facade.js";
import type { CoreSessionMessage } from "../../session-event-stream/src/session-event-stream-facade.js";
import { buildProviderTurnOptions } from "./provider-turn-options.js";
import type {
  CoreSession,
  ProviderRuntimeBinding,
} from "./session-request-handler-types.js";

interface ProfileCreatorResultContext {
  readonly getBinding: (
    sessionId: string
  ) => ProviderRuntimeBinding | undefined;
  readonly getSession: (sessionId: string) => CoreSession | undefined;
  readonly publishError: (sessionId: string, error: string) => void;
  readonly publishMessage: (
    message: CoreSessionMessage
  ) => CoreSessionMessage | null;
  readonly publishTurnState: (
    sessionId: string,
    state: "idle" | "running"
  ) => void;
}

interface ProfileCreatorResultHandlerOptions {
  readonly agent?: Pick<ProfileStudioAgentFacade, "parseTurnResult">;
  readonly authoring?: Pick<
    ProfileStudioAuthoringFacade,
    "applyCreatorSnapshot"
  >;
}

const REPAIR_PROMPT_PREFIX = `Your previous structured result was rejected by
the Profile Studio Core validator. The draft was not changed. Return a corrected
full result that matches the supplied JSON Schema. Validation error:`;

export class ProfileCreatorResultHandler {
  private readonly agent: Pick<ProfileStudioAgentFacade, "parseTurnResult">;
  private readonly authoring: Pick<
    ProfileStudioAuthoringFacade,
    "applyCreatorSnapshot"
  >;
  private readonly repairPendingSessions = new Set<string>();

  constructor(options: ProfileCreatorResultHandlerOptions = {}) {
    this.agent = options.agent ?? new ProfileStudioAgentFacade();
    this.authoring = options.authoring ?? createDefaultAuthoringFacade();
  }

  handle(
    context: ProfileCreatorResultContext,
    sessionId: string,
    event: Record<string, unknown>
  ): boolean {
    const session = context.getSession(sessionId);
    if (
      session?.sessionPurpose?.type !== "profile-creator" ||
      event.type !== "structured_output" ||
      !isRecord(event.output)
    ) {
      return false;
    }
    const parsed = this.agent.parseTurnResult(event.output);
    if (!parsed.ok) {
      this.rejectAndRepair(context, session, event, parsed.error);
      return true;
    }
    this.repairPendingSessions.delete(sessionId);
    this.publishAssistantResponse(
      context,
      sessionId,
      event,
      parsed.result.assistantResponse
    );
    if (parsed.result.draft) {
      this.authoring
        .applyCreatorSnapshot({
          profileId: session.sessionPurpose.profileId,
          snapshot: parsed.result.draft,
        })
        .then((result) => {
          if (!result.ok) {
            this.rejectAndRepair(context, session, event, result.error);
          }
        })
        .catch((error: unknown) => {
          this.rejectAndRepair(context, session, event, describeError(error));
        });
    }
    return true;
  }

  private publishAssistantResponse(
    context: ProfileCreatorResultContext,
    sessionId: string,
    event: Record<string, unknown>,
    text: string
  ): void {
    if (!text.trim()) {
      return;
    }
    context.publishMessage({
      id: `${readEventId(event)}::profile_creator_response`,
      role: "assistant",
      sessionId,
      text,
      timestamp: readEventTimestamp(event),
    });
  }

  private rejectAndRepair(
    context: ProfileCreatorResultContext,
    session: CoreSession,
    event: Record<string, unknown>,
    error: string
  ): void {
    const sessionId = session.id;
    const repairWasPending = this.repairPendingSessions.delete(sessionId);
    context.publishMessage({
      id: `${readEventId(event)}::profile_creator_repair`,
      role: "system",
      sessionId,
      text: repairWasPending
        ? `Profile Creator repair failed; draft unchanged. ${error}`
        : `Profile Creator result rejected; draft unchanged. Automatic repair requested. ${error}`,
      timestamp: readEventTimestamp(event),
    });
    if (repairWasPending) {
      return;
    }
    const binding = context.getBinding(sessionId);
    if (!binding) {
      context.publishError(
        sessionId,
        "Profile Creator repair binding is unavailable."
      );
      return;
    }
    this.repairPendingSessions.add(sessionId);
    context.publishTurnState(sessionId, "running");
    binding.adapter
      .sendMessage(
        binding.providerSessionId,
        `${REPAIR_PROMPT_PREFIX}\n${error}`,
        buildProviderTurnOptions(session)
      )
      .catch((repairError: unknown) => {
        this.repairPendingSessions.delete(sessionId);
        context.publishTurnState(sessionId, "idle");
        context.publishError(sessionId, describeError(repairError));
      });
  }
}

function createDefaultAuthoringFacade(): ProfileStudioAuthoringFacade {
  const profileStore = new ProfileStoreFacade();
  const lifecycle = new ProfileStudioLifecycleFacade({
    profileAuthoring: new ProfileAuthoringFacade({ profileStore }),
    profileMaterializer: new ProfileMaterializerFacade(),
    profileStore,
  });
  return new ProfileStudioAuthoringFacade({ lifecycle });
}

function readEventId(event: Record<string, unknown>): string {
  return typeof event.uuid === "string"
    ? event.uuid
    : `profile-creator-${globalThis.crypto.randomUUID()}`;
}

function readEventTimestamp(event: Record<string, unknown>): string {
  return typeof event.timestamp === "string"
    ? event.timestamp
    : new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const profileCreatorResultHandler = new ProfileCreatorResultHandler();
