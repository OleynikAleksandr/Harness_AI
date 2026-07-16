import type {
  GrokCliLocationOptions as GrokCliLocationOptionsInput,
  GrokCliProbe as GrokCliProbeResult,
} from "./grok-cli-locator.js";
import { locateGrokCli, probeGrokCli } from "./grok-cli-locator.js";
import {
  GrokProviderAdapter,
  type GrokProviderAdapterOptions,
} from "./grok-provider-adapter.js";

export class GrokProviderFacade extends GrokProviderAdapter {
  readonly #locationOptions: GrokCliLocationOptionsInput;

  constructor(options: GrokProviderAdapterOptions = {}) {
    super(options);
    this.#locationOptions = options;
  }

  locateBinary(): Promise<string | null> {
    return locateGrokCli(this.#locationOptions);
  }

  probeReadiness(): Promise<GrokCliProbeResult> {
    return probeGrokCli(this.#locationOptions);
  }
}

export const grokProviderFacade = new GrokProviderFacade();

export type {
  GrokAcpErrorShape,
  GrokAcpNotification,
  GrokAcpRequest,
  GrokAcpRequestId,
  GrokAcpResponse,
  GrokAcpReverseRequestHandler,
} from "./grok-acp-contracts.js";
export {
  GROK_ACP_ERROR_CODES,
  GrokAcpProtocolError,
  GrokAcpRequestCancelledError,
  GrokAcpRequestTimeoutError,
} from "./grok-acp-contracts.js";
export type {
  GrokAcpProcessExit,
  GrokAcpProcessOptions,
  GrokAcpProcessReporter,
} from "./grok-acp-process.js";
export { GrokAcpProcess } from "./grok-acp-process.js";
export type {
  GrokAcpRequestOptions,
  GrokAcpRouterOptions,
} from "./grok-acp-router.js";
export { GrokAcpRouter } from "./grok-acp-router.js";
export type {
  GrokBillingClientOptions,
  GrokBillingPeriod,
  GrokBillingSnapshot,
} from "./grok-billing-client.js";
export {
  GrokBillingClient,
  normalizeGrokBillingSnapshot,
} from "./grok-billing-client.js";
export type {
  GrokCliLocationOptions,
  GrokCliProbe,
} from "./grok-cli-locator.js";
export { GrokEventNormalizer } from "./grok-event-normalizer.js";
export type {
  GrokModelCatalog,
  GrokModelDescriptor,
  GrokReasoningEffortDescriptor,
} from "./grok-model-catalog.js";
export { normalizeGrokModelCatalog } from "./grok-model-catalog.js";
export type {
  GrokProfileApplication,
  GrokProfileVerificationExpectation,
  GrokSessionProfileState,
} from "./grok-profile-application.js";
export {
  buildGrokProfileApplication,
  resolveGrokSessionProfileState,
  verifyGrokProfileApplication,
} from "./grok-profile-application.js";
export type {
  GrokProcessFactoryOptions,
  GrokProviderAdapterOptions,
} from "./grok-provider-adapter.js";
export { GrokProviderAdapter } from "./grok-provider-adapter.js";
export type {
  GrokSessionRuntimeOptions,
  GrokSessionStartResult,
  GrokSessionTransport,
} from "./grok-session-runtime.js";
export { GrokSessionRuntime } from "./grok-session-runtime.js";
export type { GrokToolSelection } from "./grok-tool-inventory.js";
export {
  GROK_TOOL_CATEGORY_MAP,
  mapGrokToolCategories,
} from "./grok-tool-inventory.js";
