import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const HTTP_TIMEOUT_MS = 120_000;
const CLI_TIMEOUT_MS = 180_000;

const CLI_PROVIDERS = {
  claude: {
    commands: ["claude", join(homedir(), ".local/bin/claude")],
    args: (request) => withOptionalModel(["--print"], request.model).concat(
      request.prompt
    )
  },
  codex: {
    commands: ["codex", join(homedir(), ".npm-global/bin/codex")],
    args: (request) =>
      ["exec", "--ask-for-approval", "never", "--sandbox", "read-only"]
        .concat(withOptionalModel([], request.model))
        .concat(request.prompt)
  },
  kimi: {
    commands: ["kimi", join(homedir(), ".kimi-code/bin/kimi")],
    args: (request) => withOptionalModel(["--prompt", request.prompt], request.model)
  },
  "glm-opencode": {
    commands: ["opencode", join(homedir(), ".opencode/bin/opencode")],
    args: (request) => ["run"]
      .concat(withOptionalModel(["--prompt", request.prompt], request.model))
  }
};

export class ProviderTurnRunnerFacade {
  async runTurn(request, deps = {}) {
    return runProviderTurn(request, deps);
  }
}

export async function runProviderTurn(request, deps = {}) {
  const normalized = normalizeRequest(request);
  if (!normalized.ok) {
    return setupNeeded(normalized.error);
  }

  if (CLI_PROVIDERS[normalized.value.providerId]) {
    return runCliProvider(normalized.value, deps);
  }

  if (normalized.value.providerId === "glm-native") {
    return runGlmNativeProvider(normalized.value, deps);
  }

  if (normalized.value.providerId === "openrouter") {
    return runOpenRouterProvider(normalized.value, deps);
  }

  if (normalized.value.providerId === "local-models") {
    return runLocalModelsProvider(normalized.value, deps);
  }

  return setupNeeded(`Unknown provider: ${normalized.value.providerId}`);
}

async function runCliProvider(request, deps) {
  const provider = CLI_PROVIDERS[request.providerId];
  try {
    const result = await callCli(
      provider.commands,
      provider.args(request),
      deps
    );
    const text = (result.stdout || result.stderr || "").trim();
    return text
      ? { ok: true, text }
      : setupNeeded(`${request.providerId} returned an empty response.`);
  } catch (error) {
    return setupNeeded(`${request.providerId} CLI is not ready: ${cleanError(error)}`);
  }
}

async function runGlmNativeProvider(request, deps) {
  const settings = await readRuntimeSettings(deps);
  const providerSettings = findProviderSettings(settings, [
    "glmNative",
    "glm-native",
    "glm"
  ]);
  const apiKey = firstText(
    providerSettings.apiKey,
    process.env.GLM_API_KEY,
    process.env.ZAI_API_KEY
  );
  const baseUrl = firstText(
    providerSettings.baseUrl,
    process.env.GLM_BASE_URL,
    process.env.ZAI_BASE_URL,
    "https://api.z.ai/api/coding/paas/v4"
  );
  const model = chooseModel(request.model, [
    providerSettings.model,
    process.env.GLM_MODEL,
    process.env.ZAI_MODEL,
    "glm-5.2"
  ]);

  if (!apiKey) {
    return setupNeeded("GLM Native API key is missing.");
  }

  return runOpenAiCompatibleProvider({
    apiKey,
    baseUrl,
    model,
    prompt: request.prompt,
    providerId: request.providerId
  }, deps);
}

async function runOpenRouterProvider(request, deps) {
  const settings = await readRuntimeSettings(deps);
  const providerSettings = findProviderSettings(settings, [
    "openRouter",
    "openrouter"
  ]);
  const apiKey = firstText(providerSettings.apiKey, process.env.OPENROUTER_API_KEY);
  const baseUrl = firstText(
    providerSettings.baseUrl,
    process.env.OPENROUTER_BASE_URL,
    "https://openrouter.ai/api/v1"
  );
  const model = chooseModel(request.model, [
    providerSettings.model,
    process.env.OPENROUTER_MODEL
  ]);

  if (!apiKey) {
    return setupNeeded("OpenRouter API key is missing.");
  }
  if (!model) {
    return setupNeeded("OpenRouter model is missing.");
  }

  return runOpenAiCompatibleProvider({
    apiKey,
    baseUrl,
    model,
    prompt: request.prompt,
    providerId: request.providerId
  }, deps);
}

async function runLocalModelsProvider(request, deps) {
  const settings = await readRuntimeSettings(deps);
  const providerSettings = findProviderSettings(settings, [
    "localModels",
    "local-models",
    "local"
  ]);
  const baseUrl = firstText(
    providerSettings.baseUrl,
    process.env.HARNESS_AI_LOCAL_MODELS_BASE_URL,
    process.env.LMSTUDIO_BASE_URL,
    "http://127.0.0.1:1234/v1"
  );
  const model = chooseModel(request.model, [
    providerSettings.model,
    process.env.HARNESS_AI_LOCAL_MODEL,
    process.env.LMSTUDIO_MODEL
  ]);

  if (!model) {
    return setupNeeded("Local model name is missing.");
  }

  return runOpenAiCompatibleProvider({
    apiKey: firstText(providerSettings.apiKey, process.env.HARNESS_AI_LOCAL_API_KEY),
    baseUrl,
    model,
    prompt: request.prompt,
    providerId: request.providerId
  }, deps);
}

async function runOpenAiCompatibleProvider(config, deps) {
  try {
    const response = await postJson(
      chatCompletionsUrl(config.baseUrl),
      {
        model: config.model,
        messages: [{ role: "user", content: config.prompt }]
      },
      config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      deps
    );
    const text = extractOpenAiText(response);
    return text
      ? { ok: true, text }
      : setupNeeded(`${config.providerId} returned an empty response.`);
  } catch (error) {
    return setupNeeded(`${config.providerId} request failed: ${cleanError(error)}`);
  }
}

function normalizeRequest(request) {
  if (!request || typeof request !== "object") {
    return { ok: false, error: "Provider request is missing." };
  }
  const providerId = String(request.providerId ?? "").trim();
  const prompt = String(request.prompt ?? "").trim();
  const model = String(request.model ?? "").trim();
  if (!providerId) {
    return { ok: false, error: "Provider id is missing." };
  }
  if (!prompt) {
    return { ok: false, error: "Prompt is empty." };
  }
  return { ok: true, value: { providerId, prompt, model } };
}

function withOptionalModel(args, model) {
  return isPlaceholderModel(model) ? args : args.concat(["--model", model]);
}

function isPlaceholderModel(model) {
  return !model || model === "cli-default" || model.endsWith("-default");
}

function chooseModel(requestModel, fallbacks) {
  return isPlaceholderModel(requestModel) ? firstText(...fallbacks) : requestModel;
}

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim();
}

async function readRuntimeSettings(deps) {
  if (deps.readRuntimeSettings) {
    return deps.readRuntimeSettings();
  }
  for (const path of [
    join(homedir(), ".harness-ai/settings/settings.json"),
    join(homedir(), ".codeai-hub/settings/settings.json")
  ]) {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch {
      continue;
    }
  }
  return {};
}

function findProviderSettings(settings, keys) {
  const providers = settings?.providers ?? {};
  for (const key of keys) {
    if (providers[key] && typeof providers[key] === "object") {
      return providers[key];
    }
  }
  return {};
}

function chatCompletionsUrl(baseUrl) {
  const cleanBase = baseUrl.replace(/\/+$/u, "");
  return cleanBase.endsWith("/chat/completions")
    ? cleanBase
    : `${cleanBase}/chat/completions`;
}

async function postJson(url, body, headers, deps) {
  if (deps.fetchJson) {
    return deps.fetchJson(url, body, headers);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      method: "POST",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function callCli(commands, args, deps) {
  if (deps.runCli) {
    return deps.runCli(commands, args);
  }

  let lastError;
  for (const command of commands) {
    try {
      return await runCliCommand(command, args);
    } catch (error) {
      lastError = error;
      if (!isMissingCommand(error)) {
        throw error;
      }
    }
  }
  throw lastError ?? new Error("command not found");
}

function runCliCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("timeout"));
    }, CLI_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`exit ${code}: ${stderr.trim() || stdout.trim()}`));
      }
    });
  });
}

function extractOpenAiText(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => item?.text ?? "")
      .join("")
      .trim();
  }
  return firstText(response?.output_text, response?.text);
}

function isMissingCommand(error) {
  return error && typeof error === "object" && error.code === "ENOENT";
}

function cleanError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+\S+/gu, "Bearer [redacted]");
}

function setupNeeded(text) {
  return { ok: false, text: `Provider setup needed: ${text}` };
}

export const providerTurnRunnerFacade = new ProviderTurnRunnerFacade();
