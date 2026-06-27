export interface ProviderTurnOptions {
  [key: string]: unknown;
}

export interface ProviderUsageLimitsRefreshRequest {
  broadcast: (event: unknown) => void;
  providerSessionId: string;
  runtimeSessionId: string;
  workspacePath: string;
}

export interface ProviderAdapter {
  closeSession(sessionId: string): Promise<void>;
  createSession(workspacePath?: string): Promise<string>;
  initialize?(): Promise<void>;
  refreshUsageLimits?(
    request: ProviderUsageLimitsRefreshRequest
  ): Promise<void> | void;
  resumeSession?(sessionId: string, workspacePath?: string): Promise<string>;
  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: ProviderTurnOptions
  ): Promise<void>;
  subscribe(sessionId: string, listener: ProviderEventListener): () => void;
}

export type ProviderEventListener = (event: unknown) => void;

export class ProviderAdapterContractFacade {
  isProviderAdapter(value: unknown): value is ProviderAdapter {
    if (!value || typeof value !== "object") {
      return false;
    }
    const candidate = value as Partial<Record<keyof ProviderAdapter, unknown>>;
    return (
      typeof candidate.closeSession === "function" &&
      typeof candidate.createSession === "function" &&
      typeof candidate.sendMessage === "function" &&
      typeof candidate.subscribe === "function"
    );
  }
}

export const providerAdapterContractFacade =
  new ProviderAdapterContractFacade();
