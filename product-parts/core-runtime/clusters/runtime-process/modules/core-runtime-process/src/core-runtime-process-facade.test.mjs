import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./core-runtime-process-facade.ts", import.meta.url),
  "utf8"
);

assert.match(source, /"\/api\/v1\/health"/u);
assert.match(source, /"\/api\/v1\/status"/u);
assert.match(source, /"\/api\/v1\/shutdown"/u);
assert.match(source, /createServer/u);
assert.match(source, /options\.onShutdown\?\.\(\)/u);
assert.match(source, /process\.env\.CORE_PORT/u);
