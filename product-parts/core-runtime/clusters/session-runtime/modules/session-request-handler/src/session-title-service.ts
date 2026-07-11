import type {
  CoreSession,
  CoreSessionActionResult,
  RegenerateCoreSessionTitleRequest,
  RenameCoreSessionRequest,
} from "./session-request-handler-types.js";

const AUTO_TITLE_LIMIT = 72;
const MANUAL_TITLE_LIMIT = 100;

export interface SessionTitleServiceContext {
  readonly getFirstUserMessage: (sessionId: string) => string | undefined;
  readonly getSession: (sessionId: string) => CoreSession | undefined;
  readonly updateSession: (session: CoreSession) => void;
}

export class SessionTitleService {
  renameSession(
    request: RenameCoreSessionRequest,
    context: SessionTitleServiceContext
  ): CoreSessionActionResult {
    const session = context.getSession(request.sessionId);
    if (!session) {
      return { error: "Session not found", ok: false };
    }
    const result = this.rename(
      session,
      request.title,
      new Date().toISOString()
    );
    if (result.ok) {
      context.updateSession(result.session);
    }
    return result;
  }

  regenerateSessionTitle(
    request: RegenerateCoreSessionTitleRequest,
    context: SessionTitleServiceContext
  ): CoreSessionActionResult {
    const session = context.getSession(request.sessionId);
    if (!session) {
      return { error: "Session not found", ok: false };
    }
    const result = this.regenerate(
      session,
      context.getFirstUserMessage(session.id),
      new Date().toISOString()
    );
    if (result.ok) {
      context.updateSession(result.session);
    }
    return result;
  }

  applyInitialAutoTitle(
    session: CoreSession,
    firstUserMessage: string,
    timestamp: string
  ): CoreSession {
    if (
      session.sessionKind === "subagent" ||
      (session.titleOrigin && session.titleOrigin !== "default")
    ) {
      return { ...session, updatedAt: timestamp };
    }
    return {
      ...session,
      title: deriveAutomaticTitle(firstUserMessage),
      titleOrigin: "auto",
      updatedAt: timestamp,
    };
  }

  rename(
    session: CoreSession,
    requestedTitle: string,
    timestamp: string
  ): CoreSessionActionResult {
    const title = normalizeTitle(requestedTitle);
    if (!title) {
      return { error: "Session title is empty", ok: false };
    }
    if (title.length > MANUAL_TITLE_LIMIT) {
      return {
        error: `Session title must be ${MANUAL_TITLE_LIMIT} characters or fewer`,
        ok: false,
      };
    }
    return {
      ok: true,
      session: {
        ...session,
        title,
        titleOrigin: "manual",
        updatedAt: timestamp,
      },
    };
  }

  regenerate(
    session: CoreSession,
    firstUserMessage: string | undefined,
    timestamp: string
  ): CoreSessionActionResult {
    if (session.sessionKind === "subagent") {
      return {
        error:
          "Automatic title regeneration is only available for primary sessions",
        ok: false,
      };
    }
    if (!firstUserMessage?.trim()) {
      return { error: "No user message is available for a title", ok: false };
    }
    return {
      ok: true,
      session: {
        ...session,
        title: deriveAutomaticTitle(firstUserMessage),
        titleOrigin: "auto",
        updatedAt: timestamp,
      },
    };
  }
}

function deriveAutomaticTitle(message: string): string {
  const normalized = normalizeTitle(message) || "New session";
  if (normalized.length <= AUTO_TITLE_LIMIT) {
    return normalized;
  }
  return `${normalized.slice(0, AUTO_TITLE_LIMIT - 1).trimEnd()}…`;
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

export const sessionTitleService = new SessionTitleService();
