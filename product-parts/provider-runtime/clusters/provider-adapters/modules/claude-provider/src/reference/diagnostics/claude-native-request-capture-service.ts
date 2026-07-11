import type { SDKInstaller } from "../installer/sdk-installer.js";
import type { ClaudeSDKAuthProvider } from "../sdk/claude-sdk-manager.js";
import type { ClaudeWorkspaceOptions } from "../types.js";
import {
  type ClaudeInteractiveReasoningEffort,
  runClaudeInteractiveCli,
} from "./claude-interactive-cli-runner.js";

export interface ClaudeNativeRequestCaptureOptions {
  readonly captureId: string;
  readonly certificateEnv: Readonly<Record<string, string>>;
  readonly certificatePath: string;
  readonly probePrompt: string;
  readonly proxyUrl: string;
  readonly recordAppliedInputEnvelope?: (
    envelope: ClaudeNativeRequestCaptureAppliedInputEnvelope
  ) => Promise<void> | void;
  readonly selectedModelId?: string | null;
  readonly selectedReasoningEffort?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}

interface ClaudeNativeRequestCaptureAppliedInputEnvelope {
  readonly binaryPath: string;
  readonly cwd: string;
  readonly kind: "claude";
  readonly mode: "interactive_cli";
  readonly model: string | null;
  readonly reasoningEffort: ClaudeInteractiveReasoningEffort | null;
}

interface ClaudeNativeRequestCaptureAuthProvider extends ClaudeSDKAuthProvider {
  ensureProviderHomeSessionBootstrap(options?: {
    readonly executablePath?: string;
    readonly workspacePath?: string;
  }): Promise<void>;
}

// Record-only native capture of the ORIGINAL interactive CLI wrapping. The
// claude binary assembles its system prompt and inline tool set by entry
// mode, and the SDK stream-json transport (even with the claude_code
// presets) yields the SDK identity and a reduced inline tool set — NOT the
// Claude Code CLI reference. So the capture drives the provider binary in a
// real pty (interactive TTY mode) through the forward capture proxy and lets
// the proxy record the request the interactive CLI actually sends: the
// "You are Claude Code..." system prompt, the full inline tool set and the
// service messages. See claude-interactive-cli-runner.ts for the pty driver.
export class ClaudeNativeRequestCaptureService {
  readonly #authManager: ClaudeNativeRequestCaptureAuthProvider;
  readonly #installer: SDKInstaller;
  readonly #workspace: ClaudeWorkspaceOptions;

  constructor(options: {
    readonly authManager: ClaudeNativeRequestCaptureAuthProvider;
    readonly installer: SDKInstaller;
    readonly workspace: ClaudeWorkspaceOptions;
  }) {
    this.#authManager = options.authManager;
    this.#installer = options.installer;
    this.#workspace = options.workspace;
  }

  async captureNativeRequest(
    options: ClaudeNativeRequestCaptureOptions
  ): Promise<void> {
    await this.#installer.ensureInstalled();
    const executablePath = this.#installer.getExecutablePath();
    await this.#authManager.ensureSubscriptionAuth({ executablePath });
    await this.#authManager.ensureProviderHomeSessionBootstrap({
      executablePath,
      workspacePath: options.workspacePath,
    });
    const modelId =
      readNonEmptyString(options.selectedModelId) ??
      readNonEmptyString(this.#workspace.defaultModel) ??
      null;
    const reasoningEffort = readClaudeInteractiveReasoningEffort(
      options.selectedReasoningEffort
    );
    await options.recordAppliedInputEnvelope?.({
      binaryPath: executablePath,
      cwd: options.workspacePath,
      kind: "claude",
      mode: "interactive_cli",
      model: modelId,
      reasoningEffort,
    });
    await runClaudeInteractiveCli({
      binaryPath: executablePath,
      env: this.buildInteractiveEnv(options),
      modelId,
      probePrompt: resolveCapturePrompt(options),
      reasoningEffort,
      workspacePath: options.workspacePath,
    });
  }

  private buildInteractiveEnv(
    options: ClaudeNativeRequestCaptureOptions
  ): Readonly<Record<string, string | undefined>> {
    return {
      ...this.#authManager.getAuthEnvironment(),
      ...options.certificateEnv,
      ALL_PROXY: options.proxyUrl,
      HTTP_PROXY: options.proxyUrl,
      HTTPS_PROXY: options.proxyUrl,
      NODE_EXTRA_CA_CERTS:
        options.certificateEnv.NODE_EXTRA_CA_CERTS ?? options.certificatePath,
      REQUESTS_CA_BUNDLE:
        options.certificateEnv.REQUESTS_CA_BUNDLE ?? options.certificatePath,
      SSL_CERT_FILE:
        options.certificateEnv.SSL_CERT_FILE ?? options.certificatePath,
    };
  }
}

const readNonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const readClaudeInteractiveReasoningEffort = (
  value: unknown
): ClaudeInteractiveReasoningEffort | null => {
  switch (value) {
    case "low":
    case "medium":
    case "high":
    case "xhigh":
    case "max":
      return value;
    default:
      return null;
  }
};

const resolveCapturePrompt = (
  options: ClaudeNativeRequestCaptureOptions
): string => readNonEmptyString(options.workflowPrompt) ?? options.probePrompt;
