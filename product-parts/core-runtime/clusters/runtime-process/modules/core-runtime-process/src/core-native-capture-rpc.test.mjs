import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rpcSource = readFileSync(
  new URL("./core-native-capture-rpc.ts", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("./core-runtime-api.ts", import.meta.url),
  "utf8"
);
const registrationSource = readFileSync(
  new URL("./core-provider-adapter-registration.ts", import.meta.url),
  "utf8"
);

// Record-only capture wiring: dedicated adapter, orchestrator, descriptor.
assert.match(rpcSource, /buildProviderAdapterInstance/u);
assert.match(rpcSource, /NativeCaptureOrchestrator/u);
assert.match(
  rpcSource,
  /runProviderCapture: \(context\) => capture\(context\)/u
);
// Kimi is restored only as a diagnostic native-CLI capture channel.
assert.match(
  rpcSource,
  /CAPTURE_PROVIDER_IDS = new Set\(\["claude", "codex", "kimi"\]\)/u
);
assert.match(rpcSource, /kimiNativeCaptureFacade\.captureNativeRequest/u);
assert.match(rpcSource, /settings\.providers\.kimiClient\.defaultModel/u);
assert.match(rpcSource, /provider_not_supported/u);
assert.match(rpcSource, /model_not_supported/u);
assert.match(rpcSource, /reasoning_not_supported/u);
assert.match(rpcSource, /getCapturableModels/u);
assert.match(rpcSource, /getCapturableModel/u);
assert.match(rpcSource, /getCaptureProviderIds/u);
assert.match(rpcSource, /settingsStoreFacade\.getSettings\(workspacePath\)/u);
assert.match(
  rpcSource,
  /readPayloadString\([\s\S]*?payload,[\s\S]*?"reasoningEffort"/u
);
assert.match(rpcSource, /model\.reasoningEfforts\.map/u);
assert.match(rpcSource, /model\.defaultReasoningEffort/u);
assert.match(rpcSource, /modelDescriptor\.reasoningEfforts\.length > 0/u);
assert.match(
  rpcSource,
  /buildProviderAdapterInstance\([\s\S]*?reasoningEffort\s*\)/u
);
assert.match(rpcSource, /model: selectedModel/u);
assert.match(
  rpcSource,
  /orchestrator\.capture\(\{[\s\S]*?reasoningEffort,[\s\S]*?runProviderCapture/u
);

// The builder is factored out and reused by the registry wiring.
assert.match(
  registrationSource,
  /export function buildProviderAdapterInstance/u
);
assert.match(
  registrationSource,
  /const adapter = buildProviderAdapterInstance\(/u
);
assert.match(registrationSource, /defaultReasoningEffort:/u);
assert.match(registrationSource, /case "ultra":/u);

// Core runtime API dispatches both capture methods.
assert.match(apiSource, /case "capture-native-request":/u);
assert.match(apiSource, /case "list-capturable-models":/u);
assert.match(apiSource, /captureNativeRequestRpcResult\(/u);
assert.match(apiSource, /listCapturableModelsRpcResult\(\)/u);

console.log("core-native-capture-rpc tests: OK");
