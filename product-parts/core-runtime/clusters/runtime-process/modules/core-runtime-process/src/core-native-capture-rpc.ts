import { providerDescriptorFacade } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { NativeCaptureOrchestrator } from "../../../../provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.js";
import { resolveCodexReasoningEffort } from "../../../../settings-and-localization/modules/settings-store/src/settings-normalization.js";
import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { buildProviderAdapterInstance } from "./core-provider-adapter-registration.js";

// Capture serves native vendor channels. The ACP Kimi capture channel was removed with the
// kimi-provider retirement (2026-07-05 user order); the accepted Kimi dumps
// remain the synthetic-native material.
const CAPTURE_PROVIDER_IDS = new Set(["claude", "codex"]);
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
  if (!(providerId && CAPTURE_PROVIDER_IDS.has(providerId))) {
    return {
      error: "provider_not_supported",
      jsonlPath: null,
      markdownPath: null,
      ok: false,
    };
  }
  const codexSettings =
    providerId === "codex"
      ? settingsStoreFacade.getSettings(workspacePath).providers.codex
      : null;
  const selectedModel = model ?? codexSettings?.defaultModel ?? null;
  const reasoningEffort = codexSettings
    ? resolveCodexReasoningEffort(
        selectedModel ?? codexSettings.defaultModel,
        codexSettings.reasoningByModel[
          selectedModel ?? codexSettings.defaultModel
        ]
      )
    : null;
  const adapter = buildProviderAdapterInstance(
    providerId as ProviderId,
    selectedModel ?? "",
    workspacePath,
    reasoningEffort
  );
  const capture = adapter?.captureNativeRequest?.bind(adapter);
  if (!capture) {
    return {
      error: "provider_not_supported",
      jsonlPath: null,
      markdownPath: null,
      ok: false,
    };
  }
  try {
    await adapter?.ensureWorkspaceHome?.(workspacePath);
    await adapter?.initialize?.();
  } catch {
    // Best-effort provider bootstrap; the capture run surfaces real failures.
  }
  const result = await orchestrator.capture({
    model: selectedModel,
    providerId: providerId as "claude" | "codex",
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
    readonly models: readonly { readonly id: string; readonly label: string }[];
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
