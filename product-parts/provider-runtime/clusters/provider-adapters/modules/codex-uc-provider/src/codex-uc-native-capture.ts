import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { homedir } from "node:os";
import path from "node:path";
import tls from "node:tls";
import type { ToolDescriptor } from "../../../../../../core-runtime/clusters/universal-client/modules/client-contract/src/client-contract-facade.js";
import type { ProviderNativeCaptureOptions } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  buildCodexUcResponsesRequest,
  type CodexUcResponsesRequest,
} from "./codex-uc-responses.js";

const DEFAULT_CAPTURE_PROFILE_ID = "codex-synthetic-native";
const CODEX_OAUTH_HOST = "chatgpt.com";
const CODEX_OAUTH_PATH = "/backend-api/codex/responses";
const DEFAULT_MODEL = "gpt-5.4-mini";
const HTTPS_PORT = 443;
const HTTP_HEAD_SEPARATOR = "\r\n\r\n";

export interface CodexUcCaptureAuthTokens {
  readonly accessToken: string;
  readonly accountId: string;
}

export interface CaptureCodexUcNativeRequestInput {
  readonly auth: CodexUcCaptureAuthTokens;
  readonly defaultTools: readonly ToolDescriptor[];
  readonly options: ProviderNativeCaptureOptions;
  readonly reasoningEffort: string | null;
}

interface CaptureProfile {
  readonly inputPrefix?: readonly Readonly<Record<string, unknown>>[];
  readonly prompt: string;
  readonly requestTemplate: Readonly<Record<string, unknown>>;
  readonly tools: readonly Readonly<Record<string, unknown>>[];
}

export async function captureCodexUcNativeRequest(
  input: CaptureCodexUcNativeRequestInput
): Promise<void> {
  const profileId = input.options.profileId || DEFAULT_CAPTURE_PROFILE_ID;
  const profile = readCodexProfile(profileId);
  const model = input.options.selectedModelId || DEFAULT_MODEL;
  const body = buildCodexUcResponsesRequest({
    instructions: profile.prompt,
    items: [{ content: input.options.probePrompt, role: "user" }],
    model,
    nativeInputPrefix: profile.inputPrefix,
    nativeTools: profile.tools,
    reasoningEffort: input.reasoningEffort,
    requestTemplate: profile.requestTemplate,
    tools: input.defaultTools,
  });
  await input.options.recordAppliedInputEnvelope?.({
    kind: "codex-uc",
    profileId,
    route: "codex-oauth-responses",
    toolSurface: "profile-native-tools",
    transport: "http-connect-mitm",
  });
  await input.options.recordDiagnosticContext?.({
    kind: "codex_uc_capture_request_shape",
    payload: summarizeCaptureRequest(body),
  });
  await postCodexUcCaptureViaProxy({
    auth: input.auth,
    bodyText: JSON.stringify(body),
    certificatePath: input.options.certificatePath,
    proxyUrl: input.options.proxyUrl,
  });
}

function readCodexProfile(profileId: string): CaptureProfile {
  const profileDir = path.join(
    resolveHarnessHome(),
    "Profiles",
    "CodexUC",
    profileId
  );
  const promptBody = readFileSync(
    path.join(profileDir, "system-prompt.md"),
    "utf8"
  ).trimEnd();
  return {
    prompt: mergeCustomInstructions(
      promptBody,
      readOptionalFile(path.join(profileDir, "custom-instructions.md"))
    ),
    inputPrefix: readOptionalJsonArray(
      path.join(profileDir, "input-prefix.json")
    ),
    requestTemplate: JSON.parse(
      readFileSync(path.join(profileDir, "request-template.json"), "utf8")
    ) as Readonly<Record<string, unknown>>,
    tools: JSON.parse(
      readFileSync(path.join(profileDir, "tools.json"), "utf8")
    ) as readonly Readonly<Record<string, unknown>>[],
  };
}

function readOptionalJsonArray(
  filePath: string
): readonly Readonly<Record<string, unknown>>[] | undefined {
  if (!existsSync(filePath)) {
    return;
  }
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  if (
    Array.isArray(parsed) &&
    parsed.every((item) => typeof item === "object" && item !== null)
  ) {
    return parsed as readonly Readonly<Record<string, unknown>>[];
  }
  throw new Error(`${filePath}: root value must be an array of objects.`);
}

function readOptionalFile(filePath: string): string | undefined {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : undefined;
}

function mergeCustomInstructions(
  prompt: string,
  customInstructions: string | undefined
): string {
  const custom = customInstructions?.trim();
  if (!custom) {
    return prompt;
  }
  const generalHeading = "\n# General\n";
  const index = prompt.indexOf(generalHeading);
  if (index < 0) {
    return `${prompt}\n\n${custom}`;
  }
  const insertIndex = index + generalHeading.length;
  return `${prompt.slice(0, insertIndex)}\n${custom}\n${prompt.slice(insertIndex)}`;
}

function resolveHarnessHome(): string {
  const configured = process.env.HARNESS_AI_HOME?.trim();
  return configured || path.join(homedir(), ".harness-ai");
}

function summarizeCaptureRequest(
  body: CodexUcResponsesRequest
): Readonly<Record<string, unknown>> {
  return {
    inputCount: body.input.length,
    inputBytes: Buffer.byteLength(JSON.stringify(body.input), "utf8"),
    instructionsBytes: Buffer.byteLength(body.instructions, "utf8"),
    store: body.store ?? null,
    topLevelKeys: Object.keys(body),
    toolsBytes: Buffer.byteLength(JSON.stringify(body.tools), "utf8"),
    toolsCount: body.tools.length,
  };
}

async function postCodexUcCaptureViaProxy(input: {
  readonly auth: CodexUcCaptureAuthTokens;
  readonly bodyText: string;
  readonly certificatePath: string;
  readonly proxyUrl: string;
}): Promise<void> {
  const proxy = new URL(input.proxyUrl);
  const socket = await connectProxy(proxy);
  await writeConnectRequest(socket);
  const tlsSocket = await startTls(socket, input.certificatePath);
  await writeHttpPost(tlsSocket, input);
  await drainSocket(tlsSocket);
}

function connectProxy(proxy: URL): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({
      host: proxy.hostname,
      port: Number.parseInt(proxy.port || "80", 10),
    });
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

function writeConnectRequest(socket: net.Socket): Promise<void> {
  const request = [
    `CONNECT ${CODEX_OAUTH_HOST}:${HTTPS_PORT} HTTP/1.1`,
    `Host: ${CODEX_OAUTH_HOST}:${HTTPS_PORT}`,
    "Proxy-Connection: keep-alive",
    "",
    "",
  ].join("\r\n");
  socket.write(request);
  return readUntilHead(socket).then((head) => {
    if (!(head.startsWith("HTTP/1.1 200") || head.startsWith("HTTP/1.0 200"))) {
      throw new Error(`CodexUC capture proxy CONNECT failed: ${head}`);
    }
  });
}

function startTls(
  socket: net.Socket,
  certificatePath: string
): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const tlsSocket = tls.connect({
      ALPNProtocols: ["http/1.1"],
      ca: readFileSync(certificatePath, "utf8"),
      servername: CODEX_OAUTH_HOST,
      socket,
    });
    tlsSocket.once("secureConnect", () => resolve(tlsSocket));
    tlsSocket.once("error", reject);
  });
}

function writeHttpPost(
  socket: tls.TLSSocket,
  input: {
    readonly auth: CodexUcCaptureAuthTokens;
    readonly bodyText: string;
  }
): Promise<void> {
  const contentLength = Buffer.byteLength(input.bodyText, "utf8");
  const requestHead = [
    `POST ${CODEX_OAUTH_PATH} HTTP/1.1`,
    `Host: ${CODEX_OAUTH_HOST}`,
    `Authorization: Bearer ${input.auth.accessToken}`,
    `chatgpt-account-id: ${input.auth.accountId}`,
    "Content-Type: application/json",
    `Content-Length: ${contentLength}`,
    "Connection: close",
    "",
    "",
  ].join("\r\n");
  return new Promise((resolve, reject) => {
    socket.write(requestHead + input.bodyText, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function readUntilHead(socket: net.Socket): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const onData = (chunk: Buffer) => {
      chunks.push(chunk);
      const text = Buffer.concat(chunks).toString("utf8");
      if (text.includes(HTTP_HEAD_SEPARATOR)) {
        cleanup();
        resolve(text.slice(0, text.indexOf(HTTP_HEAD_SEPARATOR)));
      }
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    socket.on("data", onData);
    socket.once("error", onError);
  });
}

function drainSocket(socket: tls.TLSSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.resume();
    socket.once("end", resolve);
    socket.once("close", resolve);
    socket.once("error", reject);
  });
}
