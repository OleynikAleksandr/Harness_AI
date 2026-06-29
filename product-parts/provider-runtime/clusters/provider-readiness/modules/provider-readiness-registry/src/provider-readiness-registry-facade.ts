export type ProviderReadinessStatus =
  | "checking"
  | "preparing"
  | "ready"
  | "failed";

export type ProviderLivenessStatus = "checking" | "ready" | "failed";
export type ProviderProvisioningStatus = "preparing" | "ready" | "failed";

export interface ProviderReadinessResult {
  readinessMessage?: string;
  readinessStatus: ProviderReadinessStatus;
}

export type ProviderReadinessRawChange =
  | {
      livenessMessage?: string;
      livenessStatus: ProviderLivenessStatus;
      providerId: string;
      scope: "liveness";
    }
  | {
      providerId: string;
      provisioningMessage?: string;
      provisioningStatus: ProviderProvisioningStatus;
      scope: "provisioning";
      workspaceId: string;
    };

export type ProviderReadinessRawChangeListener = (
  change: ProviderReadinessRawChange
) => void;

interface ProviderRawState {
  message?: string;
  status: string;
}

export class ProviderReadinessRegistryFacade {
  private readonly liveness = new Map<string, ProviderRawState>();
  private readonly listeners = new Set<ProviderReadinessRawChangeListener>();
  private readonly provisioning = new Map<
    string,
    Map<string, ProviderRawState>
  >();

  combine(providerId: string, workspaceId: string): ProviderReadinessResult {
    const liveness = this.liveness.get(providerId);
    if (liveness?.status === "failed") {
      return readinessResult("failed", liveness.message);
    }
    if (liveness?.status !== "ready") {
      return readinessResult("checking", liveness?.message);
    }

    const provisioning = this.provisioning.get(providerId)?.get(workspaceId);
    if (provisioning?.status === "failed") {
      return readinessResult("failed", provisioning.message);
    }
    if (provisioning?.status !== "ready") {
      return readinessResult("preparing", provisioning?.message);
    }

    return { readinessStatus: "ready" };
  }

  setLiveness(
    providerId: string,
    status: ProviderLivenessStatus,
    message?: string
  ): void {
    const next = { message, status };
    if (isSameState(this.liveness.get(providerId), next)) {
      return;
    }
    this.liveness.set(providerId, next);
    this.publish({
      livenessMessage: message,
      livenessStatus: status,
      providerId,
      scope: "liveness",
    });
  }

  setProvisioning(
    providerId: string,
    workspaceId: string,
    status: ProviderProvisioningStatus,
    message?: string
  ): void {
    const byWorkspace = this.provisioning.get(providerId) ?? new Map();
    this.provisioning.set(providerId, byWorkspace);

    const next = { message, status };
    if (isSameState(byWorkspace.get(workspaceId), next)) {
      return;
    }
    byWorkspace.set(workspaceId, next);
    this.publish({
      providerId,
      provisioningMessage: message,
      provisioningStatus: status,
      scope: "provisioning",
      workspaceId,
    });
  }

  subscribe(listener: ProviderReadinessRawChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(change: ProviderReadinessRawChange): void {
    for (const listener of [...this.listeners]) {
      listener(change);
    }
  }
}

function isSameState(
  current: ProviderRawState | undefined,
  next: ProviderRawState
): boolean {
  return current?.status === next.status && current.message === next.message;
}

function readinessResult(
  readinessStatus: ProviderReadinessStatus,
  readinessMessage?: string
): ProviderReadinessResult {
  return readinessMessage === undefined
    ? { readinessStatus }
    : { readinessMessage, readinessStatus };
}

export const providerReadinessRegistryFacade =
  new ProviderReadinessRegistryFacade();
