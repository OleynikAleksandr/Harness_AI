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
// Capture serves the two native vendor channels; the ACP kimi capture
// channel left with the kimi-provider retirement (2026-07-05 user order).
assert.match(
  rpcSource,
  /CAPTURE_PROVIDER_IDS = new Set\(\["claude", "codex"\]\)/u
);
assert.doesNotMatch(rpcSource, /"kimi"/u);
assert.match(rpcSource, /provider_not_supported/u);
assert.match(rpcSource, /getCapturableModels/u);
assert.match(rpcSource, /getCaptureProviderIds/u);

// The builder is factored out and reused by the registry wiring.
assert.match(
  registrationSource,
  /export function buildProviderAdapterInstance/u
);
assert.match(
  registrationSource,
  /const adapter = buildProviderAdapterInstance\(/u
);

// Core runtime API dispatches both capture methods.
assert.match(apiSource, /case "capture-native-request":/u);
assert.match(apiSource, /case "list-capturable-models":/u);
assert.match(apiSource, /captureNativeRequestRpcResult\(/u);
assert.match(apiSource, /listCapturableModelsRpcResult\(\)/u);

console.log("core-native-capture-rpc tests: OK");
