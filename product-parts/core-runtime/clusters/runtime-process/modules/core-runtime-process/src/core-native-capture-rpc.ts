import { kimiNativeCaptureFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/kimi-native-capture/src/kimi-native-capture-facade.js";
import {
  type CapturableModel,
  type NativeCaptureReasoningEffort,
  providerDescriptorFacade,
} from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { NativeCaptureOrchestrator } from "../../../../provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.js";
import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { buildProviderAdapterInstance } from "./core-provider-adapter-registration.js";

// Kimi is a diagnostic native-CLI channel only; its production sessions keep
// using `kimi-client` and the Core universal client.
const CAPTURE_PROVIDER_IDS = new Set(["claude", "codex", "kimi"]);
// The Claude capture drives the provider binary interactively in a pty
// (boot the UI, type the probe, submit), which does not fit the 30s proxy
// default that suits the direct Codex client.
const CLAUDE_INTERACTIVE_CAPTURE_TIMEOUT_MS = 120_000;
const orchestrator = new NativeCaptureOrchestrator();

export interface CaptureNativeRequestRpcResult {
  readonly error: string | null;
  readonly jsonlPath: string | null;
  readonly markdownPath: string | null;
  readonly ok: boolean;
}

// Diagnostic native request capture: builds a dedicated adapter instance (so an
// active session's registered adapter is never clobbered) and drives it through
// the Core capture orchestrator. Record-only, vendor-default request.
export async function captureNativeRequestRpcResult(
  payload: unknown,
  workspacePath: string
): Promise<CaptureNativeRequestRpcResult> {
  const providerId = readPayloadString(payload, "providerId");
  const model = readPayloadString(payload, "model");
  const requestedReasoningEffort = readPayloadString(
    payload,
    "reasoningEffort"
  );
  if (!(providerId && CAPTURE_PROVIDER_IDS.has(providerId))) {
    return captureFailure("provider_not_supported");
  }
  const settings = settingsStoreFacade.getSettings(workspacePath);
  let providerDefaultModel = settings.providers.kimiClient.defaultModel;
  if (providerId === "codex") {
    providerDefaultModel = settings.providers.codex.defaultModel;
  } else if (providerId === "claude") {
    providerDefaultModel = settings.providers.claude.defaultModel;
  }
  const selectedModel = model ?? providerDefaultModel;
  const modelDescriptor = providerDescriptorFacade.getCapturableModel(
    providerId,
    selectedModel
  );
  if (!modelDescriptor) {
    return captureFailure("model_not_supported");
  }
  let storedReasoningEffort: string | undefined;
  if (providerId === "codex") {
    storedReasoningEffort =
      settings.providers.codex.reasoningByModel[selectedModel];
  } else if (providerId === "claude") {
    storedReasoningEffort =
      settings.providers.claude.thinkingByModel[selectedModel] ??
      settings.providers.claude.thinking.effort;
  }
  const reasoningEffort = resolveCaptureReasoningEffort({
    model: modelDescriptor,
    requestedReasoningEffort,
    storedReasoningEffort,
  });
  if (
    !reasoningEffort &&
    (requestedReasoningEffort || modelDescriptor.reasoningEfforts.length > 0)
  ) {
    return captureFailure("reasoning_not_supported");
  }
  const adapter =
    providerId === "kimi"
      ? null
      : buildProviderAdapterInstance(
          providerId as ProviderId,
          selectedModel,
          workspacePath,
          reasoningEffort
        );
  const capture =
    providerId === "kimi"
      ? kimiNativeCaptureFacade.captureNativeRequest.bind(
          kimiNativeCaptureFacade
        )
      : adapter?.captureNativeRequest?.bind(adapter);
  if (!capture) {
    return captureFailure("provider_not_supported");
  }
  try {
    await adapter?.ensureWorkspaceHome?.(workspacePath);
    await adapter?.initialize?.();
  } catch {
    // Best-effort provider bootstrap; the capture run surfaces real failures.
  }
  const result = await orchestrator.capture({
    model: selectedModel,
    providerId: providerId as "claude" | "codex" | "kimi",
    reasoningEffort,
    runProviderCapture: (context) => capture(context),
    workspacePath,
    ...(providerId === "claude"
      ? { timeoutMs: CLAUDE_INTERACTIVE_CAPTURE_TIMEOUT_MS }
      : {}),
  });
  return {
    error: result.error,
    jsonlPath: result.jsonlPath,
    markdownPath: result.markdownPath,
    ok: result.ok,
  };
}

export interface CapturableProvidersRpcResult {
  readonly ok: true;
  readonly providers: readonly {
    readonly id: string;
    readonly models: readonly CapturableModel[];
  }[];
}

// Per-provider capturable model catalog for the Native Request Capture UI.
export function listCapturableModelsRpcResult(): CapturableProvidersRpcResult {
  return {
    ok: true,
    providers: providerDescriptorFacade.getCaptureProviderIds().map((id) => ({
      id,
      models: providerDescriptorFacade.getCapturableModels(id),
    })),
  };
}

function readPayloadString(payload: unknown, key: string): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return;
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function captureFailure(error: string): CaptureNativeRequestRpcResult {
  return {
    error,
    jsonlPath: null,
    markdownPath: null,
    ok: false,
  };
}

function resolveCaptureReasoningEffort(options: {
  readonly model: CapturableModel;
  readonly requestedReasoningEffort?: string;
  readonly storedReasoningEffort?: string;
}): NativeCaptureReasoningEffort | null {
  const supportedEfforts = options.model.reasoningEfforts.map(
    (effort) => effort.id
  );
  if (options.requestedReasoningEffort) {
    return supportedEfforts.includes(
      options.requestedReasoningEffort as NativeCaptureReasoningEffort
    )
      ? (options.requestedReasoningEffort as NativeCaptureReasoningEffort)
      : null;
  }
  if (
    options.storedReasoningEffort &&
    supportedEfforts.includes(
      options.storedReasoningEffort as NativeCaptureReasoningEffort
    )
  ) {
    return options.storedReasoningEffort as NativeCaptureReasoningEffort;
  }
  return options.model.defaultReasoningEffort;
}
