import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./provider-liveness-checker-facade.ts", import.meta.url),
  "utf8"
)
  .replace(/^import[\s\S]*?;\n/gmu, "")
  .replace(/export const providerLivenessCheckerFacade[\s\S]*?;\n/u, "");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { ProviderLivenessCheckerFacade } = await import(moduleUrl);

const changes = [];
const checker = new ProviderLivenessCheckerFacade({
  authStore: {
    getApiKey: (providerId) =>
      providerId === "openrouter-client" ? "key" : null,
  },
  createHomeAdapter: () => ({
    closeSession: () => Promise.resolve(),
    createSession: () => Promise.resolve("session"),
    initialize: () => Promise.resolve(),
    sendMessage: () => Promise.resolve(),
    subscribe() {
      return () => undefined;
    },
  }),
  getCapabilities: (providerId) => ({
    requiresProviderHome: providerId === "codex",
  }),
  globalHomeAdapterFactory: {
    runGlobalHomePreflight({ buildAdapter }) {
      buildAdapter({ providerHomePath: "/tmp/global/codex/home" });
      return Promise.resolve();
    },
  },
  loadLocalModels: async () => ["local-model"],
  readinessRegistry: {
    setLiveness(providerId, status, message) {
      changes.push({ message, providerId, status });
    },
  },
});

await checker.checkProvider("codex");
await checker.checkProvider("openrouter-client");
await checker.checkProvider("local-models-client");

assert.deepEqual(
  changes.map(({ providerId, status }) => `${providerId}:${status}`),
  [
    "codex:checking",
    "codex:ready",
    "openrouter-client:checking",
    "openrouter-client:ready",
    "local-models-client:checking",
    "local-models-client:ready",
  ]
);

const failures = [];
await new ProviderLivenessCheckerFacade({
  authStore: { getApiKey: () => null },
  createHomeAdapter: checker.deps.createHomeAdapter,
  getCapabilities: () => ({ requiresProviderHome: false }),
  globalHomeAdapterFactory: checker.deps.globalHomeAdapterFactory,
  loadLocalModels: async () => [],
  readinessRegistry: {
    setLiveness(providerId, status, message) {
      failures.push({ message, providerId, status });
    },
  },
}).checkProvider("openrouter-client");

assert.deepEqual(failures.at(-1), {
  message: "Add an OpenRouter API key in Provider Settings.",
  providerId: "openrouter-client",
  status: "failed",
});
