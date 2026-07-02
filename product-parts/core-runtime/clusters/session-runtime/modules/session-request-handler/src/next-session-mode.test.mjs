import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./next-session-mode.ts", import.meta.url),
  "utf8"
);

assert.match(source, /invocationMode: "native"/u);
assert.match(source, /requestMode: "raw"/u);

const { resolveNextSessionMode } = await import(
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
  ).toString("base64")}`
);

// No input, junk input, and native selections resolve to the Native baseline.
assert.deepEqual(resolveNextSessionMode(), {
  invocationMode: "native",
  requestMode: "raw",
});
assert.deepEqual(resolveNextSessionMode("junk"), {
  invocationMode: "native",
  requestMode: "raw",
});
assert.deepEqual(
  resolveNextSessionMode({ invocationMode: "native", requestMode: "raw" }),
  { invocationMode: "native", requestMode: "raw" }
);
assert.deepEqual(
  resolveNextSessionMode({
    invocationMode: "managed",
    managedProfileId: "native",
  }),
  { invocationMode: "native", requestMode: "raw" }
);
assert.deepEqual(
  resolveNextSessionMode({ invocationMode: "managed", managedProfileId: "  " }),
  { invocationMode: "native", requestMode: "raw" }
);

// A managed selection with a concrete profile id activates; requestMode
// stays raw until the normalizer exists.
assert.deepEqual(
  resolveNextSessionMode({
    invocationMode: "managed",
    managedProfileId: "review",
    requestMode: "normalized",
  }),
  {
    invocationMode: "managed",
    managedProfileId: "review",
    managedProfileSelection: "user",
    requestMode: "raw",
  }
);
