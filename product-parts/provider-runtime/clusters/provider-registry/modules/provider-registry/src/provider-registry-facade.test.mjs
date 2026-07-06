import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./provider-registry-facade.ts", import.meta.url),
  "utf8"
);

assert.match(source, /id: "native-raw"/u);
assert.match(source, /id: "codex-uc"/u);
assert.match(source, /name: "CodexUC"/u);
assert.match(source, /label: "Native · Raw"/u);
assert.match(source, /id: "managed-auto-normalizer"/u);
assert.match(
  source,
  /listInvocationProfiles\(\): ProviderInvocationProfile\[\]/u
);
