import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { KimiNativeRequestCaptureOptions } from "../provider/kimi-provider-types.js";
import { KimiWireProcessBridge } from "../wire/kimi-wire-process.js";
import { KimiWireRouter } from "../wire/kimi-wire-router.js";
import { rewriteKimiProviderBaseUrls } from "./kimi-capture-config-rewrite.js";

const KIMI_CONFIG_DIRNAME = ".kimi-code";
const CLONE_ENTRIES = ["config.toml", "credentials", "device_id", "tui.toml"];
// After the kimi client posts the first LLM request the reverse bridge has the
// payload; give the ACP turn a short settle window, then tear the process down
// (the orchestrator has already resolved on the bridge capture).
const CAPTURE_SETTLE_MS = 12_000;

export interface KimiNativeRequestCaptureServiceDeps {
  readonly baseEnv: NodeJS.ProcessEnv;
  readonly kimiCommand: string;
  // The real user kimi config dir (`~/.kimi-code`) to clone from; overridable
  // for tests.
  readonly sourceConfigDir: string;
}

// Record-only native capture of the ORIGINAL Kimi CLI wrapping. The kimi
// binary ignores proxy env, so the capture points its config `base_url` at
// the reverse bridge instead: it clones the user's `~/.kimi-code` into a temp
// home, rewrites the provider base URLs to the bridge (preserving the path),
// runs `kimi acp` with the DEFAULT agent (no managed profile) and drives one
// probe turn (initialize -> session/new -> session/prompt). The kimi binary's
// first LLM request to the bridge carries the native system prompt + tool
// schemas, which the bridge forwards to the vendor and records.
export class KimiNativeRequestCaptureService {
  private readonly deps: KimiNativeRequestCaptureServiceDeps;

  constructor(deps: KimiNativeRequestCaptureServiceDeps) {
    this.deps = deps;
  }

  async captureNativeRequest(
    options: KimiNativeRequestCaptureOptions
  ): Promise<void> {
    const tempHome = await mkdtemp(path.join(tmpdir(), "kimi-capture-"));
    try {
      await this.prepareClonedHome(tempHome, options.proxyUrl);
      await options.recordAppliedInputEnvelope?.({
        bridgeUrl: options.proxyUrl,
        kind: "kimi",
        mode: "acp_default_agent",
        selectedModelId: options.selectedModelId ?? null,
        sourceConfigDir: this.deps.sourceConfigDir,
      });
      await this.runProbeTurn(tempHome, options);
    } finally {
      await rm(tempHome, { force: true, recursive: true });
    }
  }

  private async prepareClonedHome(
    tempHome: string,
    bridgeUrl: string
  ): Promise<void> {
    const destConfigDir = path.join(tempHome, KIMI_CONFIG_DIRNAME);
    await mkdir(destConfigDir, { recursive: true });
    // Copy only the auth/config entries — not logs, sessions, telemetry — so
    // the capture home is minimal and carries no session residue.
    for (const entry of CLONE_ENTRIES) {
      await cp(
        path.join(this.deps.sourceConfigDir, entry),
        path.join(destConfigDir, entry),
        { force: true, recursive: true }
      ).catch(() => undefined);
    }
    const configPath = path.join(destConfigDir, "config.toml");
    const original = await readFile(configPath, "utf8");
    await writeFile(
      configPath,
      rewriteKimiProviderBaseUrls(original, bridgeUrl),
      "utf8"
    );
  }

  private async runProbeTurn(
    tempHome: string,
    options: KimiNativeRequestCaptureOptions
  ): Promise<void> {
    const process = new KimiWireProcessBridge({
      args: ["acp"],
      command: this.deps.kimiCommand,
      cwd: options.workspacePath,
      env: {
        ...this.deps.baseEnv,
        HOME: tempHome,
        KIMI_CLI_NO_AUTO_UPDATE: "1",
      },
      onLine: (line) => router.handleLine(line),
    });
    const router = new KimiWireRouter({
      // Auto-approve any agent-side request (e.g. a permission prompt) so the
      // probe turn is not blocked; the capture only needs the first LLM call.
      onRequest: () => ({}),
      sendJson: (message) => process.sendJson(message),
    });
    await process.start();
    try {
      await router.request("initialize", {
        clientCapabilities: {
          fs: { readTextFile: false, writeTextFile: false },
          terminal: false,
        },
        clientInfo: { name: "harness-ai-capture", version: "0.0.1" },
        protocolVersion: 1,
      });
      const session = await router.request("session/new", {
        cwd: options.workspacePath,
        mcpServers: [],
      });
      const sessionId = readSessionId(session);
      await this.applyModel(router, sessionId, options.selectedModelId);
      const promptTurn = router.request("session/prompt", {
        prompt: [{ text: resolveProbePrompt(options), type: "text" }],
        sessionId,
      });
      await Promise.race([
        promptTurn.catch(() => undefined),
        delay(CAPTURE_SETTLE_MS),
      ]);
    } finally {
      await process.stop();
    }
  }

  private async applyModel(
    router: KimiWireRouter,
    sessionId: string,
    selectedModelId: string | null | undefined
  ): Promise<void> {
    const model = selectedModelId?.trim();
    if (!model) {
      return;
    }
    await router
      .request("session/set_config_option", {
        configId: "model",
        sessionId,
        value: model,
      })
      .catch(() => undefined);
  }
}

function readSessionId(session: unknown): string {
  if (typeof session === "object" && session !== null) {
    const value = (session as Record<string, unknown>).sessionId;
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  throw new Error("Kimi capture: session/new did not return a sessionId");
}

function resolveProbePrompt(options: KimiNativeRequestCaptureOptions): string {
  const workflow = options.workflowPrompt?.trim();
  return workflow && workflow.length > 0 ? workflow : options.probePrompt;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
