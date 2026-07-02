import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import {
  type NativeCaptureFailureReason,
  type NativeCaptureProviderId,
  NativeRequestCaptureWriter,
} from "../../capture-artifacts/src/capture-artifacts-facade.js";
import {
  NativeCaptureCertificateStore,
  type NativeCaptureTlsCredentials,
} from "../../capture-certificates/src/capture-certificates-facade.js";
import {
  type NativeCaptureProxyHandle,
  type NativeCaptureTargetRule,
  NativeRequestCaptureProxy,
} from "../../capture-proxy/src/capture-proxy-facade.js";

const DIAGNOSTIC_PROBE_PROMPT =
  "Harness AI native request capture probe. This request must not be sent upstream.";

// Provider model endpoints to match. Refined per adapter in Phase 3 (Kimi's
// host in particular is verified when the Kimi capture adapter lands).
export const DEFAULT_CAPTURE_TARGET_RULES: Readonly<
  Record<NativeCaptureProviderId, readonly NativeCaptureTargetRule[]>
> = {
  claude: [
    {
      host: "api.anthropic.com",
      pathIncludes: "/v1/messages",
      minimumToolCount: 1,
    },
  ],
  codex: [
    { host: "chatgpt.com", pathIncludes: "/backend-api/codex/responses" },
  ],
  kimi: [{ host: "api.moonshot.ai", pathIncludes: "/v1/chat/completions" }],
};

// Context handed to the provider adapter so it can drive its own client. Its
// shape matches the provider adapter contract's `ProviderNativeCaptureOptions`
// so the RPC callback is `(ctx) => adapter.captureNativeRequest(ctx)`. Env
// injection is provider knowledge and lives in the adapters; the orchestrator
// stays provider-neutral. For the Kimi wire-only path the proxy fields carry
// placeholder values.
export interface ProviderCaptureContext {
  readonly captureId: string;
  readonly certificateEnv: Readonly<Record<string, string>>;
  readonly certificatePath: string;
  readonly probePrompt: string;
  readonly providerId: NativeCaptureProviderId;
  readonly proxyUrl: string;
  readonly recordAppliedInputEnvelope: (
    envelope: Readonly<Record<string, unknown>>
  ) => Promise<void>;
  readonly recordDiagnosticContext: (record: {
    readonly kind: string;
    readonly payload: unknown;
  }) => Promise<void>;
  readonly selectedModelId: string | null;
  readonly workspacePath: string;
}

export type RunProviderCapture = (
  context: ProviderCaptureContext
) => Promise<void>;

const KIMI_WIRE_PROXY_URL = "wire://kimi";

export interface NativeCaptureCommand {
  readonly model?: string | null;
  readonly outputDir?: string;
  readonly providerId: NativeCaptureProviderId;
  readonly runProviderCapture: RunProviderCapture;
  readonly targetRules?: readonly NativeCaptureTargetRule[];
  readonly timeoutMs?: number;
  readonly workspacePath?: string | null;
}

export interface NativeCaptureCommandResult {
  readonly error: string | null;
  readonly jsonlPath: string | null;
  readonly markdownPath: string | null;
  readonly model: string | null;
  readonly ok: boolean;
  readonly providerId: NativeCaptureProviderId;
  readonly reason: NativeCaptureFailureReason | null;
}

interface CertificateStoreLike {
  prepareHostCredentials(hostname: string): Promise<{
    readonly caCertPath: string;
    readonly credentials: NativeCaptureTlsCredentials;
    readonly envHints: Readonly<Record<string, string>>;
  }>;
}

type ProxyFactory = (
  options: ConstructorParameters<typeof NativeRequestCaptureProxy>[0]
) => Pick<NativeRequestCaptureProxy, "start">;

interface NativeCaptureOrchestratorOptions {
  readonly captureIdFactory?: () => string;
  readonly certificateStore?: CertificateStoreLike;
  readonly clock?: () => Date;
  readonly outputDir?: string;
  readonly proxyFactory?: ProxyFactory;
}

// Command-level facade: validates the (provider, model) request, mints a
// capture id, wires the certificate store + capture proxy + artifact writer,
// invokes the provider adapter capture through the proxy, applies the
// timeout/target rules, and returns the artifact paths.
export class NativeCaptureOrchestrator {
  private readonly captureIdFactory: () => string;
  private readonly certificateStore: CertificateStoreLike;
  private readonly clock: () => Date;
  private readonly outputDir: string;
  private readonly proxyFactory: ProxyFactory;

  constructor(options: NativeCaptureOrchestratorOptions = {}) {
    this.captureIdFactory = options.captureIdFactory ?? randomUUID;
    this.certificateStore =
      options.certificateStore ?? new NativeCaptureCertificateStore();
    this.clock = options.clock ?? (() => new Date());
    this.outputDir = options.outputDir ?? defaultOutputDir();
    this.proxyFactory =
      options.proxyFactory ??
      ((proxyOptions) => new NativeRequestCaptureProxy(proxyOptions));
  }

  async capture(
    command: NativeCaptureCommand
  ): Promise<NativeCaptureCommandResult> {
    const captureId = this.captureIdFactory();
    const writer = await NativeRequestCaptureWriter.create({
      captureId,
      clock: this.clock,
      outputDir: command.outputDir ?? this.outputDir,
      providerId: command.providerId,
      selectedModelId: command.model ?? null,
    });
    if (command.providerId === "kimi") {
      return await this.captureWireOnly({ captureId, command, writer });
    }
    return await this.captureViaProxy({ captureId, command, writer });
  }

  // Claude/Codex: run the provider client through the capture-and-abort proxy.
  private async captureViaProxy(params: {
    readonly captureId: string;
    readonly command: NativeCaptureCommand;
    readonly writer: NativeRequestCaptureWriter;
  }): Promise<NativeCaptureCommandResult> {
    const { command, writer } = params;
    const targetRules =
      command.targetRules ?? DEFAULT_CAPTURE_TARGET_RULES[command.providerId];
    const firstHost = targetRules[0]?.host;
    if (!firstHost) {
      await writer.complete("failed", "target_not_seen");
      return failure(command, writer, "target_not_seen");
    }
    const bundle =
      await this.certificateStore.prepareHostCredentials(firstHost);
    const proxy = this.proxyFactory({
      providerId: command.providerId,
      targetRules,
      timeoutMs: command.timeoutMs,
      resolveTlsCredentials: async ({ hostname }) =>
        (await this.certificateStore.prepareHostCredentials(hostname))
          .credentials,
    });
    const handle = await proxy.start();
    try {
      return await this.runCapture({
        captureId: params.captureId,
        bundle,
        command,
        handle,
        writer,
      });
    } finally {
      await handle.stop();
    }
  }

  // Kimi: wire-only, no proxy. The Kimi ACP runtime writes a wire log; the
  // adapter records the applied-input-envelope and diagnostic context.
  private async captureWireOnly(params: {
    readonly captureId: string;
    readonly command: NativeCaptureCommand;
    readonly writer: NativeRequestCaptureWriter;
  }): Promise<NativeCaptureCommandResult> {
    const { command, writer } = params;
    try {
      await command.runProviderCapture(
        this.buildContext({
          captureId: params.captureId,
          certificateEnv: {},
          certificatePath: "",
          command,
          proxyUrl: KIMI_WIRE_PROXY_URL,
          writer,
        })
      );
      await writer.complete("captured");
      return success(command, writer);
    } catch (error) {
      await writer.complete("failed", "runtime_failed");
      return failure(command, writer, "runtime_failed", error);
    }
  }

  private buildContext(params: {
    readonly captureId: string;
    readonly certificateEnv: Readonly<Record<string, string>>;
    readonly certificatePath: string;
    readonly command: NativeCaptureCommand;
    readonly proxyUrl: string;
    readonly writer: NativeRequestCaptureWriter;
  }): ProviderCaptureContext {
    const { command, writer } = params;
    return {
      captureId: params.captureId,
      certificateEnv: params.certificateEnv,
      certificatePath: params.certificatePath,
      probePrompt: DIAGNOSTIC_PROBE_PROMPT,
      providerId: command.providerId,
      proxyUrl: params.proxyUrl,
      recordAppliedInputEnvelope: (envelope) =>
        writer.recordAppliedInputEnvelope(envelope),
      recordDiagnosticContext: (record) =>
        writer.recordDiagnosticContext(record),
      selectedModelId: command.model ?? null,
      workspacePath: command.workspacePath ?? "",
    };
  }

  private async runCapture(params: {
    readonly bundle: Awaited<
      ReturnType<CertificateStoreLike["prepareHostCredentials"]>
    >;
    readonly captureId: string;
    readonly command: NativeCaptureCommand;
    readonly handle: NativeCaptureProxyHandle;
    readonly writer: NativeRequestCaptureWriter;
  }): Promise<NativeCaptureCommandResult> {
    const { command, handle, writer } = params;
    const proxyRun = handle
      .waitForCapture()
      .then((result) => ({ kind: "proxy" as const, result }));
    const providerRun = command
      .runProviderCapture(
        this.buildContext({
          captureId: params.captureId,
          certificateEnv: params.bundle.envHints,
          certificatePath: params.bundle.caCertPath,
          command,
          proxyUrl: handle.proxyUrl,
          writer,
        })
      )
      .then(() => ({ kind: "provider_done" as const }))
      .catch((error: unknown) => ({ kind: "provider_failed" as const, error }));

    const first = await Promise.race([proxyRun, providerRun]);
    const outcome =
      first.kind === "proxy" ? first : await this.awaitProxy(handle, first);
    if (outcome.kind === "proxy" && outcome.result.status === "captured") {
      await writer.writeCapturedRequest(outcome.result.request);
      await writer.complete("captured");
      return success(command, writer);
    }
    if (outcome.kind === "provider_failed") {
      await writer.complete("failed", "runtime_failed");
      return failure(command, writer, "runtime_failed", outcome.error);
    }
    const reason =
      outcome.kind === "proxy" && outcome.result.status !== "captured"
        ? outcome.result.reason
        : "target_not_seen";
    await writer.complete(reason === "timeout" ? "timeout" : "failed", reason);
    return failure(command, writer, reason);
  }

  // The provider finished (or failed) before a capture: still wait for the
  // proxy so a request already in flight is recorded before we give up.
  private async awaitProxy(
    handle: NativeCaptureProxyHandle,
    providerOutcome:
      | { readonly kind: "provider_done" }
      | { readonly error: unknown; readonly kind: "provider_failed" }
  ): Promise<
    | {
        readonly kind: "proxy";
        readonly result: Awaited<
          ReturnType<NativeCaptureProxyHandle["waitForCapture"]>
        >;
      }
    | { readonly error: unknown; readonly kind: "provider_failed" }
    | { readonly kind: "provider_done" }
  > {
    const result = await handle.waitForCapture();
    if (result.status === "captured") {
      return { kind: "proxy", result };
    }
    return providerOutcome;
  }
}

function defaultOutputDir(): string {
  const home =
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai");
  return path.join(home, "logs", "native-request-capture");
}

function success(
  command: NativeCaptureCommand,
  writer: NativeRequestCaptureWriter
): NativeCaptureCommandResult {
  return {
    error: null,
    jsonlPath: writer.artifacts.jsonlPath,
    markdownPath: writer.artifacts.markdownPath,
    model: command.model ?? null,
    ok: true,
    providerId: command.providerId,
    reason: null,
  };
}

function failure(
  command: NativeCaptureCommand,
  writer: NativeRequestCaptureWriter,
  reason: NativeCaptureFailureReason,
  error?: unknown
): NativeCaptureCommandResult {
  return {
    error: describeError(error) ?? reason,
    jsonlPath: writer.artifacts.jsonlPath,
    markdownPath: writer.artifacts.markdownPath,
    model: command.model ?? null,
    ok: false,
    providerId: command.providerId,
    reason,
  };
}

function describeError(error: unknown): string | null {
  if (error === undefined) {
    return null;
  }
  return error instanceof Error ? error.message : String(error);
}
