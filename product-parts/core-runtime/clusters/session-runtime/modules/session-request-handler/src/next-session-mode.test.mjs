import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./next-session-mode.ts", import.meta.url),
  "utf8"
);

assert.match(source, /invocationMode: "native"/u);
assert.match(source, /requestMode: "raw"/u);
assert.match(source, /resolveNextSessionMode\(_input\?: unknown\)/u);
assert.doesNotMatch(source, /return _input/u);
